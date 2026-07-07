import { encryptJson, decryptJson } from './vault'

type EncryptedColumns = { enc_payload: string; enc_iv: string }

/** Encrypts a content object into the two DB columns every encrypted table shares. */
export async function toEncryptedColumns<Content extends object>(
  content: Content,
  dek: CryptoKey,
): Promise<EncryptedColumns> {
  const { ciphertext, iv } = await encryptJson(content, dek)
  return { enc_payload: ciphertext, enc_iv: iv }
}

/** Decrypts enc_payload/enc_iv and merges the result with the row's remaining (structural) fields. */
export async function fromEncryptedColumns<Content, Row extends EncryptedColumns>(
  row: Row,
  dek: CryptoKey,
): Promise<Omit<Row, 'enc_payload' | 'enc_iv'> & Content> {
  const { enc_payload, enc_iv, ...structural } = row
  const content = await decryptJson<Content>(enc_payload, enc_iv, dek)
  return { ...structural, ...content } as Omit<Row, 'enc_payload' | 'enc_iv'> & Content
}
