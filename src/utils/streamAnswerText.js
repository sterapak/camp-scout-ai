/**
 * Streams answer text in fixed-size chunks for incremental UI rendering.
 */

/**
 * @param {string} answer
 * @param {(partialAnswer: string) => void} onUpdate
 * @param {{ chunkSize?: number, delayMs?: number }} [options]
 * @returns {Promise<void>}
 */
export async function streamAnswerText(answer, onUpdate, { chunkSize = 12, delayMs = 20 } = {}) {
  const text = answer ?? ''
  if (text.length === 0) {
    onUpdate('')
    return
  }

  for (let index = chunkSize; index < text.length; index += chunkSize) {
    onUpdate(text.slice(0, index))
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  onUpdate(text)
}
