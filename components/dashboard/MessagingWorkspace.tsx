"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { useNotificationContext } from "@/context/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import {
  getOrCreateConversation,
  listMessages,
  listStudentContacts,
  listTeacherContacts,
  markConversationRead,
  sendMessage,
  subscribeToConversation,
} from "@/services/messageService";
import { ChatContact, ChatMessage } from "@/types/message";

interface MessagingWorkspaceProps {
  role: "student" | "teacher";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function clockTime(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function tempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function MessagingWorkspace({ role }: MessagingWorkspaceProps) {
  const { profile } = useAuth();
  const { pushToast } = useNotificationContext();

  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [search, setSearch] = useState("");

  const [activeContact, setActiveContact] = useState<ChatContact | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Load the directory of people this user can chat with.
  useEffect(() => {
    if (!profile) return;
    let active = true;
    setLoadingContacts(true);
    (async () => {
      try {
        const rows =
          role === "student"
            ? await listStudentContacts(profile.id)
            : await listTeacherContacts(profile.id);
        if (active) setContacts(rows);
      } catch (error) {
        if (active) {
          pushToast(error instanceof Error ? error.message : "Could not load contacts.", "error");
        }
      } finally {
        if (active) setLoadingContacts(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [profile, role, pushToast]);

  // Merge an incoming/sent message into the thread, de-duplicating against
  // optimistic placeholders and realtime echoes of our own message.
  const upsertMessage = useCallback((incoming: ChatMessage) => {
    setMessages((current) => {
      if (current.some((m) => m.id === incoming.id)) return current;
      // Replace a matching optimistic placeholder from the same sender.
      const pendingIndex = current.findIndex(
        (m) => m.pending && m.senderId === incoming.senderId && m.body === incoming.body,
      );
      if (pendingIndex >= 0) {
        const next = [...current];
        next[pendingIndex] = incoming;
        return next;
      }
      return [...current, incoming];
    });
  }, []);

  const openConversation = useCallback(
    async (contact: ChatContact) => {
      if (!profile) return;
      setActiveContact(contact);
      setMessages([]);
      setLoadingThread(true);

      // Tear down any previous realtime subscription.
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }

      try {
        const studentId = role === "student" ? profile.id : contact.userId;
        const teacherId = role === "teacher" ? profile.id : contact.userId;
        const conversation = await getOrCreateConversation(studentId, teacherId);
        setConversationId(conversation.id);

        const history = await listMessages(conversation.id);
        setMessages(history);

        channelRef.current = subscribeToConversation(conversation.id, (message) => {
          upsertMessage(message);
          if (message.senderId !== profile.id) {
            markConversationRead(conversation.id, profile.id).catch(() => {});
          }
        });

        await markConversationRead(conversation.id, profile.id);
        setContacts((current) =>
          current.map((item) =>
            item.userId === contact.userId ? { ...item, unreadCount: 0 } : item,
          ),
        );
      } catch (error) {
        pushToast(error instanceof Error ? error.message : "Could not open chat.", "error");
      } finally {
        setLoadingThread(false);
      }
    },
    [profile, role, pushToast, upsertMessage],
  );

  // Clean up the subscription on unmount.
  useEffect(() => {
    return () => {
      if (channelRef.current) channelRef.current.unsubscribe();
    };
  }, []);

  // Auto-scroll to the newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const onSend = async (event: FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !profile || !conversationId || sending) return;

    const optimistic: ChatMessage = {
      id: tempId(),
      conversationId,
      senderId: profile.id,
      body,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    // Realtime UI: the message appears instantly, before it reaches the DB.
    setMessages((current) => [...current, optimistic]);
    setDraft("");
    setSending(true);

    try {
      const saved = await sendMessage(conversationId, profile.id, body);
      upsertMessage(saved);
      setMessages((current) => current.filter((m) => m.id !== optimistic.id || m.id === saved.id));
    } catch (error) {
      setMessages((current) => current.filter((m) => m.id !== optimistic.id));
      setDraft(body);
      pushToast(error instanceof Error ? error.message : "Message failed to send.", "error");
    } finally {
      setSending(false);
    }
  };

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter(
      (c) =>
        c.displayName.toLowerCase().includes(query) || c.email.toLowerCase().includes(query),
    );
  }, [contacts, search]);

  const partnerLabel = role === "student" ? "teachers" : "students";

  return (
    <section className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-lg border border-slate-200 bg-white">
      {/* Conversation list */}
      <aside
        className={`flex w-full flex-col border-r border-slate-200 sm:w-80 ${
          activeContact ? "hidden sm:flex" : "flex"
        }`}
      >
        <div className="border-b border-slate-200 p-3">
          <h2 className="text-lg font-bold text-slate-900">Messages</h2>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${partnerLabel}...`}
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingContacts ? (
            <p className="p-4 text-sm text-slate-500">Loading {partnerLabel}...</p>
          ) : filteredContacts.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">
              {role === "student"
                ? "No teachers yet. Enroll in a course to chat with its teacher."
                : "No students yet. Students enrolled in your courses appear here."}
            </p>
          ) : (
            filteredContacts.map((contact) => {
              const active = activeContact?.userId === contact.userId;
              return (
                <button
                  key={contact.userId}
                  type="button"
                  onClick={() => openConversation(contact)}
                  className={`flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left transition ${
                    active ? "bg-blue-50" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    {initials(contact.displayName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-slate-900">
                        {contact.displayName}
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">
                        {clockTime(contact.lastMessageAt)}
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm text-slate-500">
                        {contact.lastMessage || "Start a conversation"}
                      </span>
                      {contact.unreadCount > 0 ? (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-green-500 px-1.5 py-0.5 text-xs font-bold text-white">
                          {contact.unreadCount}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Thread */}
      <div className={`min-w-0 flex-1 flex-col ${activeContact ? "flex" : "hidden sm:flex"}`}>
        {!activeContact ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate-500">
            Select a {role === "student" ? "teacher" : "student"} to start chatting.
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
              <button
                type="button"
                onClick={() => setActiveContact(null)}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-600 sm:hidden"
                aria-label="Back"
              >
                ←
              </button>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                {initials(activeContact.displayName)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{activeContact.displayName}</p>
                <p className="truncate text-xs capitalize text-slate-500">{activeContact.role}</p>
              </div>
            </header>

            <div className="flex-1 space-y-2 overflow-y-auto bg-slate-100 p-4">
              {loadingThread ? (
                <p className="text-center text-sm text-slate-500">Loading conversation...</p>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-slate-500">
                  No messages yet. Say hello 👋
                </p>
              ) : (
                messages.map((message) => {
                  const mine = message.senderId === profile?.id;
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                          mine
                            ? "rounded-br-sm bg-green-600 text-white"
                            : "rounded-bl-sm bg-white text-slate-800"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                        <p
                          className={`mt-1 text-right text-[10px] ${
                            mine ? "text-green-100" : "text-slate-400"
                          }`}
                        >
                          {clockTime(message.createdAt)}
                          {mine ? (message.pending ? " · sending" : " · sent") : ""}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={onSend} className="flex items-center gap-2 border-t border-slate-200 p-3">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Type a message"
                className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white transition hover:bg-green-700 disabled:opacity-50"
                aria-label="Send message"
              >
                ➤
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
