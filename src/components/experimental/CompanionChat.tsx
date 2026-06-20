import { motion } from 'framer-motion';
import { Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { ChatTurn } from '../../lib/companionBrain';
import { cx } from '../../lib/utils';

const OPENER: ChatTurn = {
  role: 'assistant',
  content: "It's me — the board. Tell me to \"add a task to…\", ask what's next or what's overdue, or just vent.",
};

/**
 * Talk to your board. A compact chat that streams the board's in-character,
 * memory- and task-aware replies token by token. Requires the brain to be ready;
 * `chat` builds the full prompt (persona + memory + board state) upstream.
 */
export function CompanionChat({
  chat,
  onClose,
}: {
  chat: (history: ChatTurn[], onToken: (chunk: string) => void) => Promise<string | null>;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatTurn[]>([OPENER]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    const history: ChatTurn[] = [...messages, { role: 'user', content: text }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);

    let streamed = '';
    const final = await chat(history, (chunk) => {
      streamed += chunk;
      setMessages((current) => {
        const copy = [...current];
        copy[copy.length - 1] = { role: 'assistant', content: streamed };
        return copy;
      });
    });

    const reply = final || streamed || '…(the board went quiet. it does that.)';
    setMessages((current) => {
      const copy = [...current];
      copy[copy.length - 1] = { role: 'assistant', content: reply };
      return copy;
    });
    setBusy(false);
  }

  return (
    <motion.div
      className="companion-chat"
      role="dialog"
      aria-label="Talk to the board"
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
    >
      <header className="companion-chat-head">
        <span className="companion-chat-title">Talk to the board</span>
        <button type="button" className="companion-chat-close" onClick={onClose} aria-label="Close chat">
          <X size={15} />
        </button>
      </header>

      <div className="companion-chat-log" ref={scrollRef}>
        {messages.map((message, index) => (
          <div key={index} className={cx('companion-chat-msg', `is-${message.role}`)}>
            {message.content || <span className="companion-chat-dots">…</span>}
          </div>
        ))}
      </div>

      <form className="companion-chat-input" onSubmit={send}>
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={busy ? 'the board is thinking…' : 'say something…'}
          aria-label="Message the board"
          disabled={busy}
        />
        <button type="submit" aria-label="Send" disabled={busy || !input.trim()}>
          <Send size={15} />
        </button>
      </form>
    </motion.div>
  );
}
