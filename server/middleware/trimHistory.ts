export function trimHistory(messages: Array<{role:string; content:string}>, maxChars = 8000) {
  let total = 0;
  const out: typeof messages = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const len = messages[i].content?.length ?? 0;
    if (total + len > maxChars && out.length) break;
    out.unshift(messages[i]);
    total += len;
  }
  return out;
}
