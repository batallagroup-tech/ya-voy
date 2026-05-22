import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Loader2 } from 'lucide-react';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, limit, doc, updateDoc } from 'firebase/firestore';
import { Message } from '../types';

interface ChatModalProps {
  orderId: string;
  recipientName: string;
  senderRole: 'user' | 'driver' | 'store';
  onClose: () => void;
}

export const ChatModal = ({ orderId, recipientName, senderRole, onClose }: ChatModalProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!orderId) return;

    const q = query(
      collection(db, 'orders', orderId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      setMessages(fetchedMessages);
      setLoading(false);
      
      // Scroll to bottom
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `orders/${orderId}/messages`);
    });

    return () => unsubscribe();
  }, [orderId]);

  const sendMsg = async () => {
    if (!input.trim() || !auth.currentUser) return;
    const text = input.trim();
    setInput('');

    try {
      await addDoc(collection(db, 'orders', orderId, 'messages'), {
        text,
        senderId: auth.currentUser.uid,
        senderRole,
        createdAt: serverTimestamp()
      });

      // Update order with last message for preview
      await updateDoc(doc(db, 'orders', orderId), {
        lastMessage: text,
        lastMessageAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `orders/${orderId}/messages`);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in slide-in-from-right">
      <header className="p-6 bg-white border-b flex items-center space-x-4">
        <button onClick={onClose} className="p-2 bg-slate-50 rounded-full active:scale-90 transition-transform">
          <ArrowLeft size={20}/>
        </button>
        <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-black text-xs">
          {recipientName?.charAt(0)}
        </div>
        <div className="flex-1">
          <p className="font-black text-sm uppercase tracking-tighter">{recipientName}</p>
          <p className="text-[10px] text-green-500 font-bold uppercase italic">En línea</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-purple-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-300 space-y-2">
            <p className="text-xs font-black uppercase tracking-widest italic">No hay mensajes aún</p>
            <p className="text-[10px] font-bold">Di hola para empezar el chat</p>
          </div>
        ) : (
          messages.map(m => {
            const isMe = m.senderId === auth.currentUser?.uid;
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-[25px] text-sm font-bold shadow-sm ${
                  isMe ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none'
                }`}>
                  {m.text}
                  <p className={`text-[8px] mt-1 opacity-50 ${isMe ? 'text-right' : 'text-left'}`}>
                    {m.createdAt ? new Date(m.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-6 bg-white border-t flex items-center space-x-3">
        <input 
          type="text" 
          placeholder="Escribe un mensaje..." 
          className="flex-1 p-4 bg-slate-50 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && sendMsg()} 
        />
        <button 
          onClick={sendMsg} 
          disabled={!input.trim()}
          className="p-4 bg-purple-600 text-white rounded-2xl shadow-lg active:scale-90 transition-transform disabled:opacity-50"
        >
          <Send size={20}/>
        </button>
      </div>
    </div>
  );
};
