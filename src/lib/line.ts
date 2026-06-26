export async function pushLineMessage(params: {
  accessToken: string;
  targetId: string;
  message: string;
}): Promise<void> {
  if (!params.accessToken) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not configured");
  }
  if (!params.targetId) {
    throw new Error("LINE_TARGET_ID is not configured");
  }

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.accessToken}`
    },
    body: JSON.stringify({
      to: params.targetId,
      messages: [{ type: "text", text: params.message }]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LINE push failed: ${response.status} ${body}`);
  }
}
