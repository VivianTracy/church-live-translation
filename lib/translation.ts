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

  if (!response.ok) {
    throw new Error("Translation failed");
  }

  const data = await response.json();

  return data.translation;
}