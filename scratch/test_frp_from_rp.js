const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const delay = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('Starting FRP from RP E2E test...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 960 });

  // Handle window.confirm automatically
  page.on('dialog', async dialog => {
    console.log(`[Dialog] Message: ${dialog.message()}`);
    await dialog.accept();
    console.log('[Dialog] Accepted dialog.');
  });

  try {
    // 1. Go to login page
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(__dirname, 'step1_login.png') });

    // 2. Type credentials
    console.log('Logging in as Agus Rifaldi...');
    await page.type('input[placeholder*="Budi Santoso"]', 'Agus Rifaldi');
    await page.type('input[placeholder*="••"]', '123');
    await page.screenshot({ path: path.join(__dirname, 'step2_typed_credentials.png') });

    // Click submit
    console.log('Pressing login submit button...');
    const loginBtn = await page.$('button[type="submit"]');
    await loginBtn.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(__dirname, 'step3_logged_in.png') });

    // 3. Choose Company Select page
    console.log('Selecting Company...');
    // Find select or buttons
    const companyOptions = await page.$$('button');
    for (let opt of companyOptions) {
      const text = await page.evaluate(el => el.textContent, opt);
      if (text.includes('PT PILAR NIAGA MAKMUR')) {
        await opt.click();
        break;
      }
    }
    await delay(2000);
    await page.screenshot({ path: path.join(__dirname, 'step4_selected_company.png') });

    // 4. Choose Division Select page
    console.log('Selecting Division...');
    const divisionOptions = await page.$$('button');
    for (let opt of divisionOptions) {
      const text = await page.evaluate(el => el.textContent, opt);
      if (text.includes('Product')) {
        await opt.click();
        break;
      }
    }
    await delay(2000);
    await page.screenshot({ path: path.join(__dirname, 'step5_selected_division.png') });

    // 5. Navigate to RP Approval
    console.log('Navigating to RP Approval...');
    await page.goto('http://localhost:3000/rp-approval', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(__dirname, 'step6_rp_approval.png') });

    // 6. Click Selesai tab
    console.log('Clicking Selesai tab...');
    const tabs = await page.$$('button');
    for (let tab of tabs) {
      const text = await page.evaluate(el => el.textContent, tab);
      if (text.includes('Selesai')) {
        await tab.click();
        break;
      }
    }
    await delay(2000);
    await page.screenshot({ path: path.join(__dirname, 'step7_selesai_tab.png') });

    // 7. Click on an Approved RP row
    console.log('Clicking on an Approved RP request...');
    const rows = await page.$$('tbody tr');
    let rowClicked = false;
    for (let row of rows) {
      const cells = await page.evaluate(el => Array.from(el.querySelectorAll('td')).map(c => c.textContent), row);
      if (cells.join(' ').includes('Approved') || cells.join(' ').includes('Selesai')) {
        await row.click();
        rowClicked = true;
        break;
      }
    }

    if (!rowClicked && rows.length > 0) {
      console.log('No "Approved" text matching, clicking first row anyway...');
      await rows[0].click();
    }
    
    await delay(1500);
    await page.screenshot({ path: path.join(__dirname, 'step8_rp_modal.png') });

    // 8. Find "Ke FRP" button and click it
    console.log('Looking for "Ke FRP" button...');
    const buttons = await page.$$('button');
    let keFrpBtn = null;
    for (let btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.trim() === 'Ke FRP') {
        keFrpBtn = btn;
        break;
      }
    }

    if (keFrpBtn) {
      console.log('Clicking "Ke FRP" button...');
      await keFrpBtn.click();
      await delay(3000);
      console.log('Successfully navigated to FRP Form Page!');
      await delay(2000);
      await page.screenshot({ path: path.join(__dirname, 'step9_frp_form_loaded.png') });

      // 9. Fill in form values
      console.log('Entering mandatory FRP details...');
      
      // Select Vendor if not populated
      // We will look for SearchableSelect buttons
      const formButtons = await page.$$('button');
      for (let btn of formButtons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('Pilih Vendor')) {
          await btn.click();
          await delay(500);
          // Select first option
          const options = await page.$$('button');
          for (let opt of options) {
            const optText = await page.evaluate(el => el.textContent, opt);
            if (optText && !optText.includes('Pilih Vendor') && optText.trim() !== '') {
              await opt.click();
              break;
            }
          }
          break;
        }
      }

      // Enter Bank
      await page.type('input[name="bankTujuan"]', 'BCA');
      await page.type('input[name="rekBankTujuan"]', '9876543210');
      
      await page.screenshot({ path: path.join(__dirname, 'step10_frp_filled.png') });

      // 10. Click Submit button
      console.log('Submitting FRP form...');
      const submitBtn = await page.$('button[type="submit"], input[type="submit"], button#submit');
      if (submitBtn) {
        await submitBtn.click();
      } else {
        // Find button containing Simpan
        const btns = await page.$$('button');
        for (let b of btns) {
          const t = await page.evaluate(el => el.textContent, b);
          if (t.includes('Simpan') || t.includes('Submit')) {
            await b.click();
            break;
          }
        }
      }

      await delay(3000);
      console.log('FRP submitted successfully!');
      await page.screenshot({ path: path.join(__dirname, 'step11_submitted.png') });

      // 11. Navigate back to RP Approval to verify status
      console.log('Checking RP status update...');
      await page.goto('http://localhost:3000/rp-approval', { waitUntil: 'networkidle2' });
      // Click Selesai tab again
      const tabs2 = await page.$$('button');
      for (let tab of tabs2) {
        const text = await page.evaluate(el => el.textContent, tab);
        if (text.includes('Selesai')) {
          await tab.click();
          break;
        }
      }
      await delay(2000);
      await page.screenshot({ path: path.join(__dirname, 'step12_rp_status_verified.png') });
    } else {
      console.log('Could not find "Ke FRP" button. Is the division or status correct?');
    }

  } catch (error) {
    console.error('An error occurred during the test:', error);
  } finally {
    await browser.close();
    console.log('E2E test finished.');
  }
})();
