/** Reorder supplied A-share identity fields without inferring names or exchanges. */
export function formatStockIdentity(label:string):string {
 const annotated=/^(.*?)(\([+-]?\d+(?:\.\d+)?%\))$/.exec(label.trim());
 const value=(annotated?.[1]??label).trim();
 const annotation=annotated?.[2]??'';
 const leading=/^(\d{6}(?:\.(?:SH|SZ|BJ))?)\s+(.+)$/.exec(value);
 if(leading)return `${leading[2].trim()} ${leading[1]}${annotation}`;
 return label;
}
