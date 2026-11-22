"use client";

import { useState } from "react";
import type { ChatView } from "@/chat/types";
import { ChatApp } from "./ChatApp";
import { ChatStart } from "./ChatStart";

/** Email-first start screen, then the chat — on one page, so starting doesn't reload. */
export function AssistedFlow({
  initial,
  copy,
  consentText,
}: {
  initial: ChatView | null;
  copy: { title: string; body: string; facts: string[] };
  consentText: string;
}) {
  const [chat, setChat] = useState(initial);
  if (chat) return <ChatApp initial={chat} />;
  return <ChatStart copy={copy} consentText={consentText} onStarted={setChat} />;
}
