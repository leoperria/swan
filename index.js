"use strict";

const puppeteer = require("puppeteer");

const NUM_RETRIES = 3;
const userName = 'dany.mura72@gmail.com';
const password = '12345678';
const win_width = 1200;
const win_height = 1000;


(async () => {

    try {

        // Open browser and page
        let args = [];
        args.push(`--window-size=${win_width},${win_height}`);
        const browser = await puppeteer.launch({
            headless: true,
            args
        });
        const page = await browser.newPage();
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.setViewport({
            width: win_width,
            height: win_height
        });

        // Login
        await gotoPageWithRetry(page, "https://swanleisure.legendonlineservices.co.uk/enterprise/account/login");
        await page.type('input[name="login.Email"', userName);
        await page.type('input[name="login.Password"', password);
        await page.click('input#login');

        await page.waitForSelector(".membershipTab");
        const loggedIn = (await page.$('.membershipTab')) !== null;
        if (!loggedIn) {
            await criticalException(`Can't login with user=${userName} and password=${password}`);
            return;
        }
        console.log("Logged in! ");

        await page.waitForSelector("#CSCAdmin");
        await clickLinkByText(page, "Class Timetable");
        await page.waitForSelector("#MemberTimetable");

        const data = await page.evaluate(() => {
            const rows = document.querySelectorAll('table#MemberTimetable tr');
            const result = [];
            let day = null;
            rows.forEach((r) => {
                if (r.className === "dayHeader") {
                    day = r.innerText.trim();
                } else if (r.className !== "header") {
                    const time = r.querySelector(".col0Item").innerText.trim();
                    const name = r.querySelector(".col1Item").innerText.trim();
                    const instructor = r.querySelector(".col3Item").innerText.trim();
                    const duration = r.querySelector(".col4Item").innerText.trim();
                    const status = r.querySelector("td:nth-last-of-type(1)").innerText.trim();
                    let bookId = null;
                    if (status !== "Past"){
                        bookId = r.querySelector('td:nth-last-of-type(1) a').getAttribute("id");
                    }
                    result.push({
                        bookId,
                        status,
                        day,
                        time,
                        name,
                        instructor,
                        duration
                    })
                }
            });
            return result;
        });

        console.dir(data.slice(0,10), {color: true});



        // await page.click("a#slot134384");
        // await page.waitForSelector("#totalAmount");
        // await page.click("#btnPayNow");

    } catch (e) {
        await criticalException(e);
    }

    // await browser.close();
})();


async function criticalException(e) {
    console.error("Critical exception: ", e);
    process.exit(1);
}

async function gotoPageWithRetry(page, url) {
    console.log("Opening url: ", url);
    let i;
    for (i = 0; i < NUM_RETRIES; ++i) {
        try {
            await page.goto(url);
            break;
        } catch (err) {
            console.error("Error: ", err);
            console.log("Retrying...");
        }
    }
    if (i === NUM_RETRIES) {
        throw new Error(`Maximum number of retries opening ${url}`);
    }
}

async function clickLinkByText(page, linkText) {
    const linkHandler = (await page.$x(`//a[contains(text(), '${linkText}')]`))[0];
    if (linkHandler) {
        await linkHandler.click();
    } else {
        throw new Error(`Can't find "${linkText}" link"`);
    }
}
