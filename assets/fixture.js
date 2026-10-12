document.getElementById('open-panel').onclick=()=>document.getElementById('details').hidden=false;
document.getElementById('complete-step').onclick=()=>document.getElementById('status').textContent='Demo step complete';

for(let i=1;i<=40;i++){const row=document.createElement('p');row.textContent=`Result row ${i}`;row.className='result-row';document.getElementById('scroll-list').append(row);}
