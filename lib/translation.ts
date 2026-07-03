export async function translateChineseToEnglish(
  chinese: string
): Promise<string> {
  const response = await fetch("/api/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: chinese }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Translation API error:", data);
    throw new Error(data.error || "Translation failed");
  }

  return data.translation;
}