"use strict";

const puppeteer = require("puppeteer");
const json = require('console-probe').json;
const moment = require('moment');

const NUM_RETRIES = 3;
const userName = 'dany.mura72@gmail.com';
const password = '';
const win_width = 1200;
const win_height = 1000;

// 15 19 * * *  /home/leonardo/.nvm/versions/node/v8.9.3/bin/node /home/leonardo/code/repos/swan/index.js >> /home/leonardo/swan.log 2>&1

const bookingPlan = {
    "Monday": {
        name: "pilates",
        time: "10:00"
    },
    "Tuesday": {
        name: "pilates",
        time: "13:15"
    },
    "Wednesday": {
        name: "Pilates",
        time: "10:00"
    },
    "Thursday": {
        name: "pilates",
        time: "13:15"
    },
    "Friday": {
        name: "Pilates",
        time: "10:15"
    },
    "Saturday": {
        name: "pilates",
        time: "13:15"
    },
    "Sunday": {
        name: "Pilates",
        time: "12:30"
    }
};


console.log("----------------------------------------------------------------------------------");
console.log(moment().format());

let browser = null;
(async () => {

    try {

        // Open browser and page
        let args = [];
        args.push(`--window-size=${win_width},${win_height}`);
        browser = await puppeteer.launch({
            headless: true,
            //slowMo: 10,
            args
        });
        const page = await browser.newPage();
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.setViewport({
            width: win_width,
            height: win_height
        });

        await login(page);

        const timeTable = await getTimeTable(page);

        json(timeTable.slice(0, 10));

        const desiredBooking = bookingPlan[getDayOfTheWeek(moment().day())];

        const booking = timeTable.find( row => {
           return row.status !== "Past"
               && row.name.toLowerCase() === desiredBooking.name.toLowerCase()
               && row.time === desiredBooking.time
               && row.classDate.isSame(moment(), "day")
        });

        console.log("desiredBooking:");
        json(desiredBooking);

        if (!booking){
            throw new Error("No booking found that matches the criteria. Giving up");
        }else {
            console.log("Booking found: ");
            json(booking);
            if (booking.status === "Add To Waiting List"){
                throw new Error("'Add to waiting list' is not implemented yet.");
            }
            await page.click(`#${booking.bookId}`);
            await page.waitForSelector("#totalAmount");
            await page.click("#btnPayNow");
            console.log("OK!!! Booking added...");
        }

        await browser.close();
    } catch (e) {
        await criticalException(e);
        if (browser) {
            await browser.close();
        }
    }


})();


async function login(page) {
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
}

async function getTimeTable(page) {
    await page.waitForSelector("#CSCAdmin");
    await clickLinkByText(page, "Class Timetable");
    await page.waitForSelector("#MemberTimetable");
    const table = await page.evaluate(() => {
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
                if (status !== "Past") {
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

    return table.map(row => ({
        ...row,
        classDate: moment(row.day, "dddd - DD MMMM YYYY")
    }));


}

// ------------------------------------------------------------------

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


function getDayOfTheWeek(day) {
    const days = [
        "Sunday", // 0
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday" // 6
    ];
    return days[day];
}
