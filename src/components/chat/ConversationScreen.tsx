import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Mic,
  Send,
  Check,
  CheckCheck,
  Clock,
  Image as ImageIcon,
  FileText,
  Film,
  X,
  Download,
  Smile
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import { VoiceRecorder } from './VoiceRecorder';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { Message } from '../../types';
import { useCall } from '../../context/CallContext';

export const ConversationScreen: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const {
    activeChat,
    selectChat,
    messages,
    sendMessage,
    sendVoiceMessage,
    sendMediaAttachment,
    sendTyping,
    typingUsers,
    isSendingMessage,
  } = useChat();
  const { startCall } = useCall();

  const [inputText, setInputText] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isAttachmentSheetOpen, setIsAttachmentSheetOpen] = useState(false);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);
  const [infoToast, setInfoToast] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSendingMessage]);

  if (!activeChat) return null;

  const isGroup = activeChat.type === 'group';
  const otherParticipant = !isGroup
    ? activeChat.participants?.find((p) => p.id !== user?.id)
    : null;

  const currentTypingUser = typingUsers[activeChat.id];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    sendTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 2500);
  };

  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText.trim();
    setInputText('');
    sendTyping(false);
    await sendMessage({ text, attachmentType: 'none' });
  };

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAttachmentSheetOpen(false);
    try {
      await sendMediaAttachment(file);
    } catch (err: any) {
      showToast(err.message || t('uploadFailed'));
    }
  };

  const showToast = (msg: string) => {
    setInfoToast(msg);
    setTimeout(() => setInfoToast(null), 3000);
  };

  const formatMessageTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderStatusIcon = (status: Message['status']) => {
    if (status === 'sending') {
      return <Clock className="w-3 h-3 text-slate-400 animate-spin" />;
    }
    if (status === 'sent') {
      return <Check className="w-3.5 h-3.5 text-slate-400" />;
    }
    if (status === 'delivered') {
      return <CheckCheck className="w-3.5 h-3.5 text-slate-400" />;
    }
    if (status === 'read') {
      return <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />;
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#0B0F19] flex flex-col max-w-md mx-auto select-none">
      {/* Toast Notification */}
      {infoToast && (
        <div className="absolute top-16 left-4 right-4 z-50 p-2.5 rounded-2xl bg-blue-600/90 text-white text-xs font-semibold shadow-xl border border-blue-400/30 text-center animate-in fade-in duration-200">
          {infoToast}
        </div>
      )}

      {/* Top App Bar */}
      <div className="sticky top-0 z-30 bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-800/80 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2 min-w-0">
          <button
            onClick={() => selectChat(null)}
            className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition active:scale-95 shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2.5 min-w-0">
            <Avatar
              src={activeChat.avatarUrl}
              name={activeChat.title}
              size="sm"
              isOnline={otherParticipant ? otherParticipant.isOnline : undefined}
            />

            <div className="min-w-0">
              <h2 className="text-xs font-bold text-white truncate">
                {activeChat.title}
              </h2>
              <p className="text-[10px] text-slate-400 truncate">
                {currentTypingUser ? (
                  <span className="text-cyan-400 font-semibold animate-pulse">
                    {currentTypingUser} {t('typing')}
                  </span>
                ) : isGroup ? (
                  <span>
                    {activeChat.participantIds?.length || 0} {t('groupMembers')}
                  </span>
                ) : otherParticipant?.isOnline ? (
                  <span className="text-emerald-400 font-semibold">{t('online')}</span>
                ) : (
                  <span>{t('offline')}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => {
              if (otherParticipant) {
                startCall(otherParticipant, 'audio');
              } else {
                showToast('Apèl gwoup pa disponib pou kounye a');
              }
            }}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-800 flex items-center justify-center transition active:scale-95"
            title="Apèl Vwa"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (otherParticipant) {
                startCall(otherParticipant, 'video');
              } else {
                showToast('Apèl gwoup pa disponib pou kounye a');
              }
            }}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-800 flex items-center justify-center transition active:scale-95"
            title="Apèl Videyo"
          >
            <Video className="w-4 h-4" />
          </button>
          <button
            onClick={() => showToast(`Info: ${activeChat.title}`)}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition active:scale-95"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/20 via-[#0B0F19] to-[#0B0F19]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-cyan-400">
              <Smile className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-400 max-w-xs">{t('noChatsSub')}</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === user?.id;

            return (
              <div
                key={`${msg.id || 'msg'}-${index}`}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                {/* Group chat sender name */}
                {isGroup && !isMe && (
                  <span className="text-[10px] font-semibold text-cyan-400 mb-0.5 ml-2">
                    {msg.senderName}
                  </span>
                )}

                <div
                  className={`relative max-w-[82%] rounded-2xl px-3 py-2 shadow-sm ${
                    isMe
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs'
                      : 'bg-[#151F38] text-slate-100 border border-slate-800/80 rounded-bl-xs'
                  }`}
                >
                  {/* Photo Attachment */}
                  {msg.attachmentType === 'image' && msg.attachmentUrl && (
                    <div
                      onClick={() => setSelectedPreviewImage(msg.attachmentUrl!)}
                      className="rounded-xl overflow-hidden mb-1.5 cursor-pointer hover:opacity-90 transition max-h-60"
                    >
                      <img
                        src={msg.attachmentUrl}
                        alt="attachment"
                        className="w-full h-auto object-cover rounded-xl"
                      />
                    </div>
                  )}

                  {/* Video Attachment */}
                  {msg.attachmentType === 'video' && msg.attachmentUrl && (
                    <div className="rounded-xl overflow-hidden mb-1.5 max-h-60">
                      <video
                        src={msg.attachmentUrl}
                        controls
                        className="w-full h-auto rounded-xl"
                      />
                    </div>
                  )}

                  {/* Voice Note Attachment */}
                  {msg.attachmentType === 'audio' && msg.attachmentUrl && (
                    <div className="my-1">
                      <VoiceMessagePlayer
                        audioUrl={msg.attachmentUrl}
                        duration={msg.audioDuration}
                        isMyMessage={isMe}
                      />
                    </div>
                  )}

                  {/* File Attachment */}
                  {msg.attachmentType === 'file' && msg.attachmentUrl && (
                    <a
                      href={msg.attachmentUrl}
                      download={msg.attachmentName || 'document'}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-700/60 my-1 hover:bg-slate-900 transition"
                    >
                      <FileText className="w-5 h-5 text-cyan-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate text-slate-200">
                          {msg.attachmentName || 'Document'}
                        </p>
                        {msg.attachmentSize && (
                          <p className="text-[10px] text-slate-400">
                            {Math.round(msg.attachmentSize / 1024)} KB
                          </p>
                        )}
                      </div>
                      <Download className="w-4 h-4 text-slate-400 shrink-0" />
                    </a>
                  )}

                  {/* Message Text */}
                  {msg.text && (
                    <p className="text-xs leading-relaxed break-words whitespace-pre-wrap">
                      {msg.text}
                    </p>
                  )}

                  {/* Meta: Timestamp and Delivery Ticks */}
                  <div
                    className={`flex items-center justify-end space-x-1 mt-1 text-[10px] ${
                      isMe ? 'text-blue-200' : 'text-slate-400'
                    }`}
                  >
                    <span>{formatMessageTime(msg.createdAt)}</span>
                    {isMe && renderStatusIcon(msg.status)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Recording Active Sheet */}
      {isRecordingVoice ? (
        <VoiceRecorder
          onSend={async (blob, duration) => {
            setIsRecordingVoice(false);
            await sendVoiceMessage(blob, duration);
          }}
          onCancel={() => setIsRecordingVoice(false)}
        />
      ) : (
        /* Standard Bottom Composer */
        <div className="bg-[#0D1527] border-t border-slate-800/80 p-2.5 flex items-center space-x-2">
          {/* Attachment Paperclip Button */}
          <button
            onClick={() => setIsAttachmentSheetOpen(true)}
            className="w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 flex items-center justify-center transition active:scale-95 shrink-0"
            title={t('attachFile')}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <form onSubmit={handleSendText} className="flex-1 flex items-center">
            <input
              type="text"
              placeholder={t('typeMessage')}
              value={inputText}
              onChange={handleInputChange}
              className="w-full bg-[#151F38] border border-slate-700/60 rounded-full px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition"
            />
          </form>

          {/* Send or Voice Record Action */}
          {inputText.trim() ? (
            <button
              onClick={() => handleSendText()}
              disabled={isSendingMessage}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 hover:brightness-110 active:scale-95 transition shrink-0"
              title={t('send')}
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          ) : (
            <button
              onClick={() => setIsRecordingVoice(true)}
              className="w-10 h-10 rounded-full bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-cyan-400 flex items-center justify-center transition active:scale-95 shrink-0"
              title={t('voiceMessage')}
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Hidden File Input for Attachments */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFilePicked}
        className="hidden"
      />

      {/* Attachment Options Drawer */}
      {isAttachmentSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#0F172A] border-t border-slate-800 rounded-t-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                {t('attachFile')}
              </h3>
              <button
                onClick={() => setIsAttachmentSheetOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3 text-center">
              <button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'image/*';
                    fileInputRef.current.click();
                  }
                }}
                className="flex flex-col items-center p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition active:scale-95"
              >
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-1.5 border border-indigo-500/30">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-300">{t('gallery')}</span>
              </button>

              <button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'video/*';
                    fileInputRef.current.click();
                  }
                }}
                className="flex flex-col items-center p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition active:scale-95"
              >
                <div className="w-11 h-11 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-1.5 border border-rose-500/30">
                  <Film className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-300">{t('video')}</span>
              </button>

              <button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = '*/*';
                    fileInputRef.current.click();
                  }
                }}
                className="flex flex-col items-center p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition active:scale-95"
              >
                <div className="w-11 h-11 rounded-2xl bg-blue-500/20 text-cyan-400 flex items-center justify-center mb-1.5 border border-blue-500/30">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-300">{t('document')}</span>
              </button>

              <button
                onClick={() => {
                  setIsAttachmentSheetOpen(false);
                  setIsRecordingVoice(true);
                }}
                className="flex flex-col items-center p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition active:scale-95"
              >
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1.5 border border-emerald-500/30">
                  <Mic className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-300">{t('voiceMessage')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Preview */}
      {selectedPreviewImage && (
        <div
          onClick={() => setSelectedPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <button
            onClick={() => setSelectedPreviewImage(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800/80 text-white flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={selectedPreviewImage}
            alt="Preview"
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
