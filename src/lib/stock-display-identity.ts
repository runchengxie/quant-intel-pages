/** Reorder supplied A-share identity fields without inferring names or exchanges. */
export function formatStockIdentity(label:string):string {
 const value=label.trim();
 const leading=/^(\d{6}(?:\.(?:SH|SZ|BJ))?)\s+(.+)$/.exec(value);
 if(leading)return `${leading[2].trim()} ${leading[1]}`;
 return label;
}
