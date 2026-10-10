const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{}),headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1080}});
 const web=process.env.TEST_WEB_URL||'http://localhost:3000';
 fs.mkdirSync('../artifacts',{recursive:true});
 const page=await context.newPage();const errors=[],policy=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.text().includes('Content Security Policy'))policy.push(m.text())});
 const tag=crypto.randomBytes(6).toString('hex'),password='Browser-'+crypto.randomBytes(16).toString('hex')+'!A9';
 let accounts=[];
 const request=async(path,method='GET',body)=>page.evaluate(async({path,method,body})=>{const r=await fetch(path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return{status:r.status,data:r.status===204?null:await r.json()}},{path,method,body});
 try{
  await page.goto(web+'/login');await page.getByRole('button',{name:'Create an admin account',exact:true}).click();
  await page.getByLabel('Your name',{exact:true}).fill('Browser QA');await page.getByLabel('Username',{exact:true}).fill('browser_'+tag);
  await page.getByLabel('Email address',{exact:true}).fill('browser-'+tag+'@example.com');await page.getByLabel('Password',{exact:true}).fill(password);await page.getByLabel('Confirm password',{exact:true}).fill(password);
  accounts.push('browser-'+tag+'@example.com');await page.getByRole('button',{name:'Create admin account',exact:true}).click();await page.getByRole('heading',{name:'Traffic overview'}).waitFor();
  assert.deepEqual((await request('/api/reports/stats')).data,{allowed:0,blocked:0});assert.equal((await request('/api/clients')).data.length,0);
  await page.screenshot({path:'../artifacts/fresh-account-empty-dashboard.png',fullPage:true});
  await page.goto(web+'/clients');await page.getByRole('button',{name:'Register client',exact:true}).first().click();
  await page.getByPlaceholder('e.g. Checkout service').fill('Browser checkout');
  const entry=page.getByRole('textbox',{name:'Request limit',exact:true});await entry.focus();await entry.press('End');for(let i=0;i<4;i++)await entry.press('Backspace');await entry.press('Home');await entry.press('3');
  const digitCount=await entry.getAttribute('maxlength');assert.equal(digitCount,'4');
  const clientResponse=page.waitForResponse(r=>r.url().endsWith('/api/clients')&&r.request().method()==='POST');await page.getByRole('button',{name:'Create client',exact:true}).click();assert.equal((await clientResponse).status(),201);
  await page.getByRole('textbox',{name:'Request limit for Browser checkout',exact:true}).waitFor();
  
  assert.equal(await page.getByRole('textbox',{name:'Request limit for Browser checkout',exact:true}).getAttribute('maxlength'),'4');
  await page.screenshot({path:'../artifacts/compact-limit-control.png',fullPage:true});
  const clients=(await request('/api/clients')).data;assert.equal(clients[0].rateLimit,3);
  await page.goto(web+'/dashboard');await page.getByRole('button',{name:'Send 5 requests',exact:true}).click();await page.getByRole('button',{name:'Run traffic test',exact:true}).click();await page.getByRole('button',{name:'Run traffic test',exact:true}).waitFor({timeout:20000});
  const stats=(await request('/api/reports/stats')).data;assert.equal(stats.allowed+stats.blocked,5);
  await page.goto(web+'/activity');await page.getByText('Browser checkout',{exact:true}).first().waitFor();
  await page.goto(web+'/jobs');await page.getByRole('heading',{name:'Work, in motion.',exact:true}).waitFor();
  await page.goto(web+'/settings');await page.getByRole('heading',{name:'Account settings'}).waitFor();
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'../artifacts/production-mobile-settings.png',fullPage:true});
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByRole('button',{name:'Create an admin account',exact:true}).click();
  await page.getByLabel('Your name',{exact:true}).fill('Second Browser QA');await page.getByLabel('Username',{exact:true}).fill('second_'+tag);await page.getByLabel('Email address',{exact:true}).fill('second-'+tag+'@example.com');await page.getByLabel('Password',{exact:true}).fill(password);await page.getByLabel('Confirm password',{exact:true}).fill(password);accounts.push('second-'+tag+'@example.com');await page.getByRole('button',{name:'Create admin account',exact:true}).click();await page.getByRole('heading',{name:'Traffic overview'}).waitFor();
  assert.deepEqual((await request('/api/reports/stats')).data,{allowed:0,blocked:0});assert.equal((await request('/api/clients')).data.length,0);assert.equal((await request('/api/history/jobs')).data.total,0);
  await page.screenshot({path:'../artifacts/second-account-empty-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(policy,[]);
  console.log(JSON.stringify({result:'PASS',checks:['real registration','zero new-account stats','client creation','compact slots','live traffic','activity','jobs','settings','mobile width','same-browser second-account isolation','CSP','no runtime errors'],digitCount}));
 }catch(e){console.log((await page.locator('body').innerText()).slice(-2500));console.log({errors,policy});await page.screenshot({path:'../artifacts/production-browser-failure.png',fullPage:true});throw e;}finally{
  for(const email of accounts){await request('/api/auth/logout','POST').catch(()=>{});const login=await request('/api/auth/login','POST',{email,password});if(login.status===200)await request('/api/auth/me','DELETE',{currentPassword:password,confirmation:'DELETE'});}
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exit(1)});
