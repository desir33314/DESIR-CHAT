import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { ActiveCall, CallType, User } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface CallContextType {
  activeCall: ActiveCall | null;
  incomingCall: { callId: string; caller: User; type: CallType } | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isFrontCamera: boolean;
  callDuration: number;
  errorMessage: string | null;
  startCall: (targetUser: User, type: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  switchCamera: () => Promise<void>;
  clearError: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    callId: string;
    caller: User;
    type: CallType;
  } | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const activeCallRef = useRef<ActiveCall | null>(null);
  activeCallRef.current = activeCall;

  const timerRef = useRef<any>(null);

  // Stop media tracks
  const stopTracks = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }
  }, [localStream, remoteStream]);

  // Cleanup peer connection
  const cleanupCall = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    stopTracks();
    setActiveCall(null);
    setIncomingCall(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
  }, [stopTracks]);

  // Duration Timer
  useEffect(() => {
    if (activeCall?.status === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeCall?.status]);

  // Initialize WebRTC Peer Connection
  const createPeerConnection = useCallback((callId: string) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = pc;

    const rStream = new MediaStream();
    setRemoteStream(rStream);

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        rStream.addTrack(track);
      });
      setRemoteStream(new MediaStream(rStream.getTracks()));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        api.sendCallSignal({
          callId,
          type: 'candidate',
          candidate: event.candidate.toJSON(),
        }).catch(console.error);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
      } else if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed' ||
        pc.connectionState === 'closed'
      ) {
        // Handle connection drop
        if (activeCallRef.current?.status === 'connected') {
          setErrorMessage('Koneksyon apèl la koupe.');
          cleanupCall();
        }
      }
    };

    return pc;
  }, [cleanupCall]);

  // Request Local Media Stream
  const getMediaStream = async (type: CallType, useFront: boolean = true): Promise<MediaStream> => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'Kamera ak Mikwofòn bezwen yon koneksyon sekirize (HTTPS oswa localhost).'
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
        video:
          type === 'video'
            ? {
                facingMode: useFront ? 'user' : 'environment',
                width: { ideal: 640 },
                height: { ideal: 480 },
              }
            : false,
      });

      setLocalStream(stream);
      return stream;
    } catch (err: any) {
      let msg = 'Pèmisyon refize: Tanpri pèmèt navigatè a sèvi ak kamera/mikwofòn.';
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Aparèy kamera oswa mikwofòn pa disponib.';
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Aksè refize nan navigatè a. Tanpri aktive pèmisyon nan paramèt yo.';
      }
      setErrorMessage(msg);
      throw new Error(msg);
    }
  };

  // Start Call (Caller side)
  const startCall = async (targetUser: User, type: CallType) => {
    setErrorMessage(null);
    try {
      const stream = await getMediaStream(type, true);

      setActiveCall({
        id: '',
        otherUser: targetUser,
        type,
        status: 'calling',
        isIncoming: false,
      });

      const res = await api.initiateCall(targetUser.id, type);

      if (res.status === 'busy') {
        setErrorMessage(res.message || 'Itilizatè a okipe nan yon lòt apèl.');
        stream.getTracks().forEach((t) => t.stop());
        setActiveCall(null);
        return;
      }

      const callId = res.callId;
      setActiveCall((prev) => (prev ? { ...prev, id: callId, status: 'ringing' } : null));

      const pc = createPeerConnection(callId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    } catch (err: any) {
      cleanupCall();
      setErrorMessage(err.message || 'Apèl la echwe.');
    }
  };

  // Accept Call (Receiver side)
  const acceptCall = async () => {
    if (!incomingCall) return;
    const { callId, caller, type } = incomingCall;
    setIncomingCall(null);
    setErrorMessage(null);

    try {
      const stream = await getMediaStream(type, true);

      setActiveCall({
        id: callId,
        otherUser: caller,
        type,
        status: 'connected',
        isIncoming: true,
      });

      const pc = createPeerConnection(callId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await api.respondCall(callId, true);
    } catch (err: any) {
      cleanupCall();
      setErrorMessage(err.message || 'Echwe aksepte apèl la.');
    }
  };

  // Decline Call
  const declineCall = async () => {
    if (!incomingCall) return;
    const { callId } = incomingCall;
    setIncomingCall(null);
    try {
      await api.respondCall(callId, false);
    } catch (e) {
      console.error(e);
    }
  };

  // End Call
  const endCall = async () => {
    const current = activeCallRef.current;
    if (current?.id) {
      try {
        await api.endCall(current.id);
      } catch (e) {
        console.error(e);
      }
    }
    cleanupCall();
  };

  // Toggle Mute
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  };

  // Toggle Video
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff((prev) => !prev);
    }
  };

  // Switch Camera
  const switchCamera = async () => {
    if (!activeCall || activeCall.type !== 'video' || !localStream) return;
    const nextFacing = !isFrontCamera;

    try {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
        localStream.removeTrack(videoTrack);
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing ? 'user' : 'environment' },
      });
      const newTrack = newStream.getVideoTracks()[0];

      if (newTrack) {
        localStream.addTrack(newTrack);
        setIsFrontCamera(nextFacing);

        // Replace track in peer connection
        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current
            .getSenders()
            .find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(newTrack);
          }
        }
      }
    } catch (err) {
      console.warn('Switch camera error:', err);
    }
  };

  // SSE Signal Handling
  useEffect(() => {
    if (!user) return;

    const cleanup = api.onRealtimeEvent(async (event, data) => {
      // Incoming Call
      if (event === 'incoming_call') {
        const { callId, caller, callType } = data;
        // If already in a call, auto-reject with busy
        if (activeCallRef.current) {
          api.respondCall(callId, false).catch(console.error);
          return;
        }
        setIncomingCall({ callId, caller, type: callType });
      }

      // Caller side: Call Accepted -> create WebRTC Offer
      if (event === 'call_accepted') {
        const { callId } = data;
        const pc = peerConnectionRef.current;
        if (pc && activeCallRef.current) {
          setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
          try {
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: activeCallRef.current.type === 'video',
            });
            await pc.setLocalDescription(offer);
            await api.sendCallSignal({
              callId,
              type: 'offer',
              sdp: offer.sdp,
            });
          } catch (err) {
            console.error('Failed to create offer:', err);
          }
        }
      }

      // Call Rejected
      if (event === 'call_rejected') {
        setErrorMessage('Itilizatè a refize apèl la oswa li okipe.');
        cleanupCall();
      }

      // Call Ended
      if (event === 'call_ended') {
        setErrorMessage('Apèl la fini.');
        cleanupCall();
      }

      // WebRTC Signal: Offer, Answer, ICE Candidate
      if (event === 'call_signal') {
        const { callId, type, sdp, candidate } = data;
        const pc = peerConnectionRef.current;
        if (!pc) return;

        try {
          if (type === 'offer' && sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await api.sendCallSignal({
              callId,
              type: 'answer',
              sdp: answer.sdp,
            });
          } else if (type === 'answer' && sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
          } else if (type === 'candidate' && candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        } catch (err) {
          console.error('Error handling WebRTC signal:', err);
        }
      }
    });

    return () => {
      cleanup();
    };
  }, [user, cleanupCall]);

  const clearError = () => setErrorMessage(null);

  return (
    <CallContext.Provider
      value={{
        activeCall,
        incomingCall,
        localStream,
        remoteStream,
        isMuted,
        isVideoOff,
        isFrontCamera,
        callDuration,
        errorMessage,
        startCall,
        acceptCall,
        declineCall,
        endCall,
        toggleMute,
        toggleVideo,
        switchCamera,
        clearError,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
