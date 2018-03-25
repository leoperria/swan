"use strict";

const puppeteer = require("puppeteer");

const NUM_RETRIES = 3;
const userName = '';
const password = '';
const win_width = 1200;
const win_height = 1000;


(async () => {

    try {

        // Open browser and page
        let args = [];
        args.push(`--window-size=${win_width},${win_height}`);
        const browser = await puppeteer.launch({
            headless: false,
            slowMo: 10,
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
        const loggedIn = (await page.$('.membershipTab')) !== null;
        if (!loggedIn) {
            await criticalException(`Can't login with user=${userName} and password=${password}`);
            return;
        }
        console.log("Logged in! ");

        // Open timetable
        await clickLinkByText(page, "Class Timetable");

    } catch (e) {
        await criticalException(e);
    }

    // await page.screenshot({path: "full.png", fullPage: true});
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
