const links=document.querySelectorAll('.nav nav a');links.forEach(a=>{a.addEventListener('click',()=>{document.body.classList.add('leaving')})});
