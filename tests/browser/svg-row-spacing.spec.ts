import {expect,test} from '@playwright/test';

for(const locale of ['en','zh'])test(`exported row separators and column titles clear actual font bounds ${locale}`,async({page})=>{
 await page.goto(locale==='en'?'/quant-intel-pages/en/':'/quant-intel-pages/?locale=zh-CN');
 const svg=page.locator('#asia-daily-chart svg');await expect(svg).toBeAttached();
 const result=await svg.evaluate(async node=>{
  await document.fonts.ready;
  const copy=node.cloneNode(true) as SVGSVGElement;copy.style.cssText="position:absolute;left:-10000px;visibility:hidden;display:block";document.body.append(copy);
  const problems:string[]=[];let checked=0;
  for(const panel of copy.querySelectorAll('[data-report-panel]')){
   const rows=[...panel.querySelectorAll<SVGGElement>('[data-report-row]')];
   for(let i=0;i<rows.length-1;i++){
    const separator=rows[i].querySelector<SVGLineElement>('line[x1="54"][x2="906"]');
    const next=rows[i+1].querySelector<SVGTextElement>('text[x="906"]');
    if(!separator||!next)continue;
    const bounds=next.getBBox();const previous=rows[i].querySelector<SVGTextElement>('text[x="906"]')?.getBBox();const y=separator.y1.baseVal.value;
    if(bounds.height<=0||!previous||previous.height<=0)problems.push("empty font bounds");
    if(previous&&y>=previous.y-1&&y<=previous.y+previous.height+1)problems.push(`preceding separator ${rows[i].dataset.reportRow}`);
    if(y>=bounds.y-1&&y<=bounds.y+bounds.height+1)problems.push(`separator ${rows[i].dataset.reportRow}`);
    checked++;
   }
   const title=panel.querySelector<SVGTextElement>(':scope > text[x="410"]');
   const cell=rows[0]?.querySelector<SVGTextElement>('text[x="410"]');
   if(title&&cell){
    const a=title.getBBox(),b=cell.getBBox();
    if(a.height<=0||b.height<=0||a.y+a.height+1>b.y)problems.push(`title ${panel.getAttribute('data-report-panel')}`);
    for(const heading of panel.querySelectorAll<SVGTextElement>(':scope > text[font-size="19"]')){const h=heading.getBBox();if(a.x<h.x+h.width&&a.x+a.width>h.x&&a.y<h.y+h.height&&a.y+a.height>h.y)problems.push(`heading overlap ${panel.getAttribute('data-report-panel')}`);}
   }
  }
  copy.remove();return {problems,checked};
 });
 expect(result.checked).toBeGreaterThan(10);expect(result.problems).toEqual([]);
});
