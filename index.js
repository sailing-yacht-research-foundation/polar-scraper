const puppeteer = require('puppeteer');
const execSync = require('child_process').execSync;
const fs = require('fs')
const axios = require('axios')
const { v4: uuidv4 } = require('uuid');

function makeCert(org, suborg, certType, builder, owner, certNumber, issuedDate, expireDate, measureDate, country, sailNumber, boatName, className, beam, draft, displacement, extras, hasPolars, polars, hasTimeAllowances, timeAllowances) {
    
    return {syrfId:uuidv4(), organization:org, subOrganization:suborg, certType:certType, builder:builder, owner:owner, certNumber:certNumber, issuedDate:issuedDate, expireDate:expireDate, measureDate:measureDate, country:country, sailNumber:sailNumber, boatName:boatName, className:className, beam:beam, draft:draft, displacement:displacement, extras:extras, hasPolars:hasPolars, polars:polars, hasTimeAllowances:timeAllowances, timeAllowances:timeAllowances}
}
 
function equals(certA, certB){
    // TODO: check orgs, issue dates and identifiers (not the syrfId) to see if the certs are equal.
    return
}

function removeExisting(potentialNewCerts){
    // TODO. Get all certs from elasticsearch with org name, then return a set of certs from the argument that isn't in the existing list from elasticsearch.
    return potentialNewCerts
}

function saveNewCerts(certs){
    // TODO. Save to elasticsearch. 
    return certs
}

async function scrapeAllCerts() {

    const browser = await puppeteer.launch()
    const page = await browser.newPage()

    var d = new Date();
    var thisYear = d.getFullYear();

    //  ORR full certs with polars.

    url = 'https://www.regattaman.com/cert_list.php?yr=' + thisYear + '&lType=all&org=327&goback=%2Fcertificate_page.php%3Fcp_tab&ctyp=ORR&rnum=0&sort=0&ssort=0&sdir=true&ssdir=true'

    await page.goto(url, {'timeout': 10000, 'waitUntil':'load'});
        const orrFullUrls = await page.evaluate(() => {
        const results = []
        document.querySelectorAll('#resTable-0 > tbody > tr > td > a').forEach(btn => {results.push(btn.onclick.toString().split('sku=')[1].split('\'')[0])})
        return results
    })

    const orrFullCerts = []

    for(skuIndex in orrFullUrls){
        url = 'https://www.regattaman.com/cert_form.php?sku=' + orrFullUrls[skuIndex] + '&rnum=0&sort=undefined&ssort=undefined&sdir=true&ssdir=true'
        console.log(url)
        await page.goto(url, {'timeout': 10000, 'waitUntil':'load'});
        var certInfo = await page.evaluate(() => {
            const boatName = document.querySelector('#boat_name_sail').textContent.split('   ')[0]
            const org = 'ORR'
            const suborg = 'None'
            const certType = 'ORR Full'
            const builder = document.querySelector('#builder').textContent
            const owner = document.querySelector('#owner').textContent
            const certNumber = document.querySelector('#cert_id').textContent
            const issuedDate = document.querySelector('#date_eff').textContent
      
       
            const expireDate = 'Unknown'
            const measureDate = document.querySelector('#meas_date').textContent
            const country = 'Unknown' // maybe they're all usa.
            const sailNum = document.querySelector('#boat_name_sail').textContent.split('   ')[1]
            const className = document.querySelector('#class').textContent
            const beamFt = document.querySelector('#beam_max').textContent
            const draftFt = document.querySelector('#draft_mt').textContent
            const displacementKg = document.querySelector('#disp_mt').textContent
            const hasPolars = true
            const hasTimeAllowances = true


         // polars.
            const windSpeeds = []
            var skippedFirst = false
            // skip 'Wind Speeds kts' text.
            document.querySelectorAll('#polar_speed > div > div > table > thead > tr > th').forEach(d => {
                if(!skippedFirst){
                    skippedFirst = true
                }else{
                    windSpeeds.push(parseFloat(d.textContent.replace('kts', '')))
                }
            })

            // opt beat angles: #polar_speed > div > div > table > tbody > tr:nth-child(1) > td
            const optBeatAngles = []
            skippedFirst = false
         
            document.querySelectorAll('#polar_speed > div > div > table > tbody > tr:nth-child(1) > td').forEach(d => {
                if(!skippedFirst){
                    skippedFirst = true
                }else{
                    optBeatAngles.push(parseFloat(d.textContent.replace('°', '')))
                }
            })

            // opt beat speeds; 
            const optBeatSpeedsKts = []
            skippedFirst = false
         
            document.querySelectorAll('#polar_speed > div > div > table > tbody > tr:nth-child(2) > td').forEach(d => {
                if(!skippedFirst){
                    skippedFirst = true
                }else{
                    optBeatSpeedsKts.push(parseFloat(d.textContent))
                }
            })

            // wind angles: #polar_speed > div > div > table > tbody > tr > td:nth-child(1)
            const trueWindAngles = []
            var currentIndex = 0
         
            document.querySelectorAll('#polar_speed > div > div > table > tbody > tr > td:nth-child(1)').forEach(d => {
                if(currentIndex >= 2 && currentIndex <= 11){ 
                    const speeds = []
                    skippedFirst = false
                    var blah = currentIndex + 1
                    document.querySelectorAll('#polar_speed > div > div > table > tbody > tr:nth-child(' + blah  + ') > td').forEach(s => {
                        if(!skippedFirst){
                            skippedFirst = true
                        }else{
                            speeds.push(parseFloat(s.textContent))
                        }
                    })
                    
                    trueWindAngles.push({"twa":parseFloat(d.textContent.replace('°', '')), "speeds":speeds})
                }
                currentIndex++
            })

            // Optimum run speeds kts : '#polar_speed > div > div > table > tbody > tr:nth-child(13) > td'
            const optRunSpeedsKts = []
            skippedFirst = false
         
            document.querySelectorAll('#polar_speed > div > div > table > tbody > tr:nth-child(13) > td').forEach(d => {
                if(!skippedFirst){
                    skippedFirst = true
                }else{
                    optRunSpeedsKts.push(parseFloat(d.textContent))
                }
            })

            // optimum run angles '#polar_speed > div > div > table > tbody > tr:nth-child(14) > td'
            const optRunAngles = []
            skippedFirst = false
         
            document.querySelectorAll('#polar_speed > div > div > table > tbody > tr:nth-child(14) > td').forEach(d => {
                if(!skippedFirst){
                    skippedFirst = true
                }else{
                    optRunAngles.push(parseFloat(d.textContent.replace('°', '')))
                }
            })

            const polars = {"windSpeeds":windSpeeds, "beatAngles":optBeatAngles, "beatVMGs":optBeatSpeedsKts,
                    "polars":trueWindAngles, "runVMGs":optRunSpeedsKts, "gybeAngles":optRunAngles}

            /** Time allowances */
            
            const windSpeedsTA = []
            skippedFirst = false

            document.querySelectorAll('#polar_time > div > div > table > thead > tr > th').forEach(d => {
                if(!skippedFirst){
                    skippedFirst = true
                }else{
                    windSpeedsTA.push(parseFloat(d.textContent.replace('kts', '')))
                }
            })

            const optBeatAnglesTA = []
            skippedFirst = false
         
            document.querySelectorAll('#polar_time > div > div > table > tbody > tr:nth-child(1) > td').forEach(d => {
                if(!skippedFirst){
                    skippedFirst = true
                }else{
                    optBeatAnglesTA.push(parseFloat(d.textContent.replace('°', '')))
                }
            })

            // opt beat speeds; 
            const optBeatSpeedsKtsTA = []
            skippedFirst = false
         
            document.querySelectorAll('#polar_time > div > div > table > tbody > tr:nth-child(2) > td').forEach(d => {
                if(!skippedFirst){
                    skippedFirst = true
                }else{
                    optBeatSpeedsKtsTA.push(parseFloat(d.textContent))
                }
            })

            const trueWindAnglesTA = []
            var currentIndex = 0
         
            document.querySelectorAll('#polar_time > div > div > table > tbody > tr > td:nth-child(1)').forEach(d => {
                if(currentIndex >= 2 && currentIndex <= 11){ 
                    const speeds = []
                    skippedFirst = false
                    var blah = currentIndex + 1
            
                    document.querySelectorAll('#polar_time > div > div > table > tbody > tr:nth-child(' + blah + ') > td').forEach(s => {
                        if(!skippedFirst){
                            skippedFirst = true
                        }else{
                            speeds.push(parseFloat(s.textContent))
                        }
                    })
                    trueWindAnglesTA.push({"twa":parseFloat(d.textContent.replace('°', '')), "speeds":speeds})
                }
                currentIndex++
            })

            const optRunSpeedsKtsTA = []
            skippedFirst = false
         
            document.querySelectorAll('#polar_time > div > div > table > tbody > tr:nth-child(13) > td').forEach(d => {
                if(!skippedFirst){
                    skippedFirst = true
                }else{
                    optRunSpeedsKtsTA.push(parseFloat(d.textContent))
                }
            })

            const timeAllowances = {"windSpeeds":windSpeedsTA, "beatVMGs":optBeatSpeedsKtsTA, "timeAllowances":trueWindAnglesTA, 
            "runVMGs":optRunSpeedsKtsTA}
            
            return {boatName, org, suborg, certType, builder, owner, certNumber, issuedDate, expireDate, measureDate, country, sailNum, 
            className, beamFt, draftFt, displacementKg, hasPolars, polars, hasTimeAllowances, timeAllowances}
        })

        const extras = await page.content();
        
        var d = new Date(certInfo.issuedDate)
        var year = d.getFullYear();
        var month = d.getMonth();
        var day = d.getDate();
        var expiredDate = new Date(thisYear, 12, 31);

        

        // fs.writeFile('./test.html', extras, (err) => {console.log(err)})
        orrFullCerts.push(makeCert(certInfo.org, certInfo.suborg, certInfo.certType, certInfo.builder, certInfo.owner, certInfo.certNumber, d, expiredDate, certInfo.measureDate, certInfo.country,
            certInfo.sailNum, certInfo.boatName, certInfo.className, certInfo.beamFt, certInfo.draftFt, certInfo.displacementKg, Buffer.from(extras).toString('base64'), true, certInfo.polars, true, certInfo.timeAllowances))
    }

    saveNewCerts(removeExisting(orrFullCerts))

    // ORR-EZ (no polars) https://www.regattaman.com/cert_list.php?yr=2018&lType=all&org=327&goback=%2Fcertificate_page.php%3Fcp_tab%3D0&ctyp=ORR-Ez%2CORR-Ez-SH%20Request%20Method:%20GET
    var url = 'https://www.regattaman.com/cert_list.php?yr=' + thisYear + '&lType=all&org=327&goback=%2Fcertificate_page.php%3Fcp_tab%3D0&ctyp=ORR-Ez%2CORR-Ez-SH%20Request%20Method:%20GET'
    console.log(url)
  
    await page.goto(url, {'timeout': 10000, 'waitUntil':'load'});

    var orrEZSkus = await page.evaluate(() => {
        const results = []
        document.querySelectorAll('#resTable-0 > tbody > tr > td > a').forEach(btn => {results.push(btn.onclick.toString().split('sku=')[1].split('\'')[0])})
        return results
    })
    
    const orrEzCerts = []

    for(skuIndex in orrEZSkus){
        const sku = orrEZSkus[skuIndex]
        url = 'https://www.regattaman.com/cert_form.php?sku=' + sku + '&rnum=0'
        console.log(url)
        await page.goto(url, {'timeout': 10000, 'waitUntil':'load'});
        var certInfo = await page.evaluate(() => {
            const boatName = document.querySelector('#boat_name').textContent
            const org = 'ORR'
            const suborg = document.querySelector('#cert_group').textContent
            const certType = 'ORR-EZ'
            const builder = document.querySelector('#builder').textContent
            const owner = document.querySelector('#owner').textContent
            const certNumber = document.querySelector('#cert_id').textContent
            const issuedDate = document.querySelector('#date_eff').textContent
            const expireDate = 'Unknown' // Need to convert issued date into date object and then add a year.
            const measureDate = 'Unknown'
            const country = 'Unknown' // maybe they're all usa.
            const sailNum = document.querySelector('#sail_id').textContent
            const className = document.querySelector('#boat_type').textContent
            const beamFt = document.querySelector('#beam_max').textContent
            const draftFt = document.querySelector('#draft_mt').textContent
            const displacementKg = document.querySelector('#disp_mt').textContent
            const hasPolars = false
            const polars = null

            return {boatName, org, suborg, certType, builder, owner, certNumber, issuedDate, expireDate, measureDate, country, sailNum, 
            className, beamFt, draftFt, displacementKg, hasPolars, polars}
        })

        var d = new Date(certInfo.issuedDate)
        var year = d.getFullYear();
        var month = d.getMonth();
        var day = d.getDate();
        var expiredDate = new Date(thisYear, 12, 31);

        const extras = await page.content();
        orrEzCerts.push(makeCert(certInfo.org, certInfo.suborg, certInfo.certType, certInfo.builder, certInfo.owner, certInfo.certNumber, d, expiredDate, certInfo.measureDate, certInfo.country,
            certInfo.sailNum, certInfo.boatName, certInfo.className, certInfo.beamFt, certInfo.draftFt, certInfo.displacementKg, Buffer.from(extras).toString('base64'), false, null, false, null))
    }
    saveNewCerts(removeExisting(orrEzCerts))

    // ORR One Design Certificates.
    url = 'https://www.regattaman.com/certificate_page.php'
    await page.goto(url, {'timeout': 10000, 'waitUntil':'load'});
    const oneDesignUrls = await page.evaluate(() => {
        const urls = []
        document.querySelectorAll('#odcert > tbody > tr > td > span > a').forEach(c => {urls.push(c.href)})
        return urls
    })

    const orrODCerts = []

    for(skuIndex in oneDesignUrls){
        url = oneDesignUrls[skuIndex]
        console.log(url)
        await page.goto(url, {'timeout': 10000, 'waitUntil':'load'});
        var certInfo = await page.evaluate(() => {
            const boatName = document.querySelector('#boat_name').textContent
            const org = 'ORR'
            const suborg = document.querySelector('#cert_group').textContent
            const certType = 'ORR-EZ One Design'
            const builder = document.querySelector('#builder').textContent
            const owner = document.querySelector('#owner').textContent
            const certNumber = document.querySelector('#cert_id').textContent
            const issuedDate = document.querySelector('#date_eff').textContent
            // TODO convert dates. Convert imperial to metric.
            const expireDate = 'Unknown' // Need to convert issued date into date object and then add a year.
            const measureDate = 'Unknown'
            const country = 'Unknown' // maybe they're all usa.
            const sailNum = document.querySelector('#sail_id').textContent
            const className = document.querySelector('#boat_type').textContent
            const beamFt = document.querySelector('#beam_max').textContent
            const draftFt = document.querySelector('#draft_mt').textContent
            const displacementKg = document.querySelector('#disp_mt').textContent
            const hasPolars = false
            const polars = null

            return {boatName, org, suborg, certType, builder, owner, certNumber, issuedDate, expireDate, measureDate, country, sailNum, 
            className, beamFt, draftFt, displacementKg, hasPolars, polars}
        })

        const extras = await page.content();

        var d = new Date(certInfo.issuedDate)
        var year = d.getFullYear();
        var month = d.getMonth();
        var day = d.getDate();
        var expiredDate = new Date(year + 1, month, day);

        orrODCerts.push(makeCert(certInfo.org, certInfo.suborg, certInfo.certType, certInfo.builder, certInfo.owner, certInfo.certNumber, d, expiredDate, certInfo.measureDate, certInfo.country,
            certInfo.sailNum, certInfo.boatName, certInfo.className, certInfo.beamFt, certInfo.draftFt, certInfo.displacementKg, Buffer.from(extras).toString('base64'), false, null, false, null))
    }
    saveNewCerts(removeExisting(orrODCerts))
    

    // ORC
    var url = 'https://data.orc.org/public/WPub.dll/RMS'
    console.log(url)
    await page.goto(url)

    const countryCodes1 = await page.evaluate(()=> {

        const codes = []
        const countries = []
        document.querySelectorAll('#rms1 > table > tbody > tr > td.country > img').forEach(c => {codes.push(c.src.split('public/')[1].split('.gif')[0])})
        document.querySelectorAll('#rms1 > table > tbody > tr > td.country > span').forEach(c => {countries.push(c.textContent)})
        return {countries, codes}
    })

    const countryCodes3 = await page.evaluate(()=> {

        const codes = []
        const countries = []
        document.querySelectorAll('#rms3 > table > tbody > tr > td.country > img').forEach(c => {codes.push(c.src.split('public/')[1].split('.gif')[0])})
        document.querySelectorAll('#rms3 > table > tbody > tr > td.country > span').forEach(c => {countries.push(c.textContent)})
        return {countries, codes}
    })
   
    const countryCodes5 = await page.evaluate(()=> {

        const codes = []
        const countries = []
        document.querySelectorAll('#rms5 > table > tbody > tr > td.country > img').forEach(c => {codes.push(c.src.split('public/')[1].split('.gif')[0])})
        document.querySelectorAll('#rms5 > table > tbody > tr > td.country > span').forEach(c => {countries.push(c.textContent)})
        return {countries, codes}
    })

    const countryCodesAll = [{list:countryCodes1, index: {name:'ORC Standard', value:'1'}}, {list:countryCodes3, index:{name: 'Double Handed', value:'3'}}, {list:countryCodes5, index:{name: 'Non Spinnaker', value:'5'}}]

    for(countryListIndex in countryCodesAll){
        var list = countryCodesAll[countryListIndex].list
       
        for(countryIndex in list.countries){
         
            var countryCode = list.codes[countryIndex]
            var countryName = list.countries[countryIndex]
           

            familyCode = countryCodesAll[countryListIndex].index.value
            familyName = countryCodesAll[countryListIndex].index.name
            axios({
                url: 'https://data.orc.org/public/WPub.dll?action=DownRMS&CountryId=' + countryCode + '&ext=json&Family='  + familyCode + '&VPPYear=' + thisYear, 
                method: 'GET',
                responseType: 'json',
            }).then((response) => {
                const orcCerts = []
          
                if(Object.keys(response.data)[0] === 'rms'){
                    
                    response.data['rms'].forEach(cert => {
                       
                    var  beatVmgs = []
                    cert['Allowances'].Beat.forEach(s => {
                        beatVmgs.push(s/3600.0)
                    })

                    var  runVmgs = []
                    cert['Allowances'].Run.forEach(s => {
                        runVmgs.push(s/3600.0)
                    })

                    var p = []
    
                    var count = 0
                    Object.keys(cert['Allowances']).forEach(k => {
                        if(count >= 2 && count <= 9){
                            var angle = parseFloat(k.split('R')[1])
                        
                            var speeds = []
                            cert['Allowances'][k].forEach(s => {
                                speeds.push(s / 3600.0)
                            })
                            p.push({"twa":angle, "speeds":speeds})
                        }
                        count++
                    })
                    var polars = {"windSpeeds":cert['Allowances'].WindSpeeds, "beatAngles":cert['Allowances'].BeatAngle, "beatVMGs":beatVmgs,
                                    "polars":p, "runVMGs":runVmgs, "gybeAngles":cert['Allowances'].GybeAngle}
                    var d = new Date(cert.IssueDate)
                    var year = d.getFullYear();
                    var month = d.getMonth();
                    var day = d.getDate();
                    var expiredDate = new Date(year + 1, month, day);
                    
                    orcCerts.push(makeCert('ORC','None', familyName, cert.Builder, 'Unknown', cert.CertNo,
                        cert.IssueDate, expiredDate, 'Unknown', countryName, cert.SailNo, cert.YachtName, cert.Class, 'Unknown', 'Unknown', 'Unknown', cert, true, polars, true, cert['Allowances']))
                    })
                 
                }
                saveNewCerts(removeExisting(orcCerts))  
            });
        }
    }

    // IRC
    const ircCerts = []
    axios({
        url: 'https://www.topyacht.com.au/rorc/data/ClubListing.csv', 
        method: 'GET',
        responseType: 'csv',
    }).then((response) => {
   
        const certs = response.data.split('\r\n')
        const valuesList = certs[0].split(',')
        var index = 0
        certs.forEach(certLine => {
            if(index > 0){

                const values = certLine.split(',')
                if(values.length > 2){
                    const boatName = values[0]
                    const sailNumber = values[1]
                    const certNumber = values[2]
                    const issuedDate = values[3]
                    const certYear = values[4]
                    const spinnakerTCC = values[5]
                    const endorsed = values[6]
                    const shortHanded = values[7]
                    const nonSpinnakerTCC = values[8]
                    const crew = values[9]
                    const dlr = values[10]
                    const lh = values[11]
                    const beam = values[12]
                    const draft = values[13]
                    const type = values[21]
                    const extras = {names: valuesList, values:values}
                 
                    const day = issuedDate.split('/')[0]
                    const month = issuedDate.split('/')[1]
                    const year = issuedDate.split('/')[2]
                    const d = new Date(year, month, day)
                    const ex = new Date(year + 1 , month, day)
                    ircCerts.push(makeCert('IRC', 'None', type, 'Unknown', 'Unknown', certNumber, d, ex, 'Unknown', 'Unknown', sailNumber, boatName, 'Unknown', beam, draft, 'Unknown', extras, false, null, false, null))
    
                }        
            }
            index++
        })
        saveNewCerts(removeExisting(ircCerts))
    
    });

    //Classics
    var yearCounter = thisYear
    const allClassicCerts = []
    while(yearCounter >= 2017){
        var url = 'https://secure.headwaytechnology.com/crf.headwaydomain.com/page/validlist/?show=summary&filterby=all&sortby=lname&phyear=' + yearCounter + '&phkeyword='
        console.log(url)
        await page.goto(url)
        
        const classicCerts = await page.evaluate(()=>{
            const certs = []
            document.querySelectorAll('body > div > div > div > div > center > div > table > tbody > tr').forEach(row =>{
                if(row.children[0].textContent !== 'Name'){
                    // owner, boatname, class, division, subdivision, sailnumber, non-spin (ft), non-spin(s/mi), spin (ft), spin (s/mi), recorded date, cert id
                    certs.push([row.children[0].textContent, row.children[1].textContent,
                        row.children[2].textContent, row.children[3].textContent, row.children[4].textContent, row.children[5].textContent,
                        row.children[6].textContent, row.children[7].textContent, row.children[8].textContent, row.children[9].textContent,
                        row.children[10].textContent, row.children[11].textContent, row.children[12].textContent])
                }
            })
            return certs
        })
        classicCerts.forEach(c => {
            var names  = [ 'owner', 'boatname', 'class', 'division', 'subdivision', 'sailnumber', 'non-spin (ft)', 'non-spin(s/mi)', 'spin (ft)', 'spin (s/mi)', 'recorded date', 'cert id']
        
            var d = new Date(c[11])
            var year = d.getFullYear();
            var month = d.getMonth();
            var day = d.getDate();
            var expiredDate = new Date(year + 1, month, day);
            
            allClassicCerts.push(makeCert('CYOA', 'None', c[3], 'Unknown', c[0], c[12], d, expiredDate, 'Unknown', 'Unknown', c[5], c[1], c[2], 'Unknown', 'Unknown', 'Unknown', {names:names, values:c}, false, null, false, null))
        })
        yearCounter--
    }
    saveNewCerts(removeExisting(allClassicCerts))
    
    page.close()
    browser.close()
   
}

scrapeAllCerts()

