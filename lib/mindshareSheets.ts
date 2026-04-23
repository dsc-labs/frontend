import { google } from 'googleapis'

export type MindshareSubmissionRow = {
  xHandle: string
  walletAddress: string
  name: string
  postSubmitted: string
}

type AppendArgs = {
  spreadsheetId: string
  sheetName: string
  clientEmail: string
  privateKey: string
  row: MindshareSubmissionRow
}

function normalizePrivateKey(key: string): string {
  let normalized = key.trim()
  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1)
  }
  normalized = normalized.replace(/\\n/g, '\n').replace(/\r/g, '').trim()
  return normalized
}

export async function appendMindshareSubmission(args: AppendArgs): Promise<void> {
  const privateKey = normalizePrivateKey(args.privateKey)
  if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is not a valid PEM private key. Use the private_key value from service-account JSON.',
    )
  }

  const auth = new google.auth.JWT({
    email: args.clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  const sheets = google.sheets({ version: 'v4', auth })

  await sheets.spreadsheets.values.append({
    spreadsheetId: args.spreadsheetId,
    range: `${args.sheetName}!A:D`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[args.row.xHandle, args.row.walletAddress, args.row.name, args.row.postSubmitted]],
    },
  })
}
