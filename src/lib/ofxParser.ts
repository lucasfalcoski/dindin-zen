export interface OFXTransaction {
  date: string;
  amount: number;
  description: string;
}

export function parseOFX(text: string): OFXTransaction[] {
  const transactions: OFXTransaction[] = [];
  const regex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const block = match[1];

    const dateMatch = block.match(/<DTPOSTED>(\d{8})/);
    const amountMatch = block.match(/<TRNAMT>([-\d.,]+)/);
    const memoMatch = block.match(/<MEMO>([^\n<]+)/) || block.match(/<NAME>([^\n<]+)/);

    if (dateMatch && amountMatch) {
      const raw = dateMatch[1];
      const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
      const amount = Math.abs(parseFloat(amountMatch[1].replace(',', '.')));
      const description = memoMatch ? memoMatch[1].trim() : 'Sem descrição';

      // Only include debits (negative amounts in OFX = expenses)
      if (parseFloat(amountMatch[1].replace(',', '.')) < 0) {
        transactions.push({ date, amount, description });
      }
    }
  }

  return transactions;
}
