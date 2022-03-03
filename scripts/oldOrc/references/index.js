const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const PDFParser = require("pdf2json");
const { time } = require('console');
var replaceall = require("replaceall");

const  pdfParser = new PDFParser();
const METERS_PER_FOOT = 0.3048;
const years = ['2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021'];
function formatClassName(className){
    return replaceall( ' ', '', className.replace('-', '').replace('.','').toLowerCase().trim().replace(' od', ' one design'))
}

function formatDisplacement(displacement){
    return parseFloat(displacement.replace('kg', '').replace('.','').replace(',',''))
}

function formatLOA(loa){
    if(loa.includes('ft')){
        return parseFloat(loa.replace('ft', '').replace(',','.'))*METERS_PER_FOOT
    }else{
        return parseFloat(loa.replace('m', '').replace(',','.'))
    }
}

function formatVersion(version){
    var newVersion = version
    years.forEach(year => {
      //  newVersion = newVersion.replace(year, '')
    })

    //return parseFloat(newVersion.trim())
    return version
}

function formatMB(mb){
    if(mb.includes('ft')){
        return parseFloat(mb.replace('ft', '').replace(',','.'))*METERS_PER_FOOT
    }else{
        return parseFloat(mb.replace('m', '').replace(',','.'))
    }
}

function formatMeters(value){
    if(value.includes('ft')){
        return parseFloat(value.replace('ft', '').replace(',','.'))*METERS_PER_FOOT
    }else{
        return parseFloat(value.replace('m', '').replace(',','.'))
    }
}
// //passsing directoryPath and callback function
// const files = fs.readdirSync('/Users/jon/Documents/SYRF/sailing-data/assorted-and-skipped/orc_cert_pdfs/')

// pdfParser.on("pdfParser_dataReady", pdfData => {
//     console.log(JSON.stringify(pdfData));
// });

// pdfParser.loadPDF("/Users/jon/Documents/SYRF/sailing-data/assorted-and-skipped/orc_cert_pdfs/3.pdf")

// const readPdf = async (uri) => {
    
//     const buffer = fs.readFileSync(uri);
//     try {
//         const data = await pdfParse(buffer);

//         // The content
//         console.log('Content: ', data.text); 
//         console.log(uri.split('.pdf')[0])
//         const paths = uri.split('/')
//         const filename = paths[paths.length-1]
//         const p = uri.split(filename)[0]
//         fs.writeFileSync(p + 'textFiles/' + filename + '.txt', data.text)

      
//     }catch(err){
//         console.log(err)
        
//     }
// }

// (async () => {
//     for(var index = 0; index < files.length; index++){
//         const file = files[index]
        
//         if(file.endsWith('.pdf')){
//             await readPdf('/Users/jon/Documents/SYRF/sailing-data/assorted-and-skipped/orc_cert_pdfs/' + file)
//         }
        
//     }
// })()

//passsing directoryPath and callback function
// const files = fs.readdirSync('/Users/jon/Documents/SYRF/sailing-data/assorted-and-skipped/orc_cert_pdfs/sailboatDataPdfs/')


// const readPdf = async (uri) => {
    
//     const buffer = fs.readFileSync(uri);
//     try {
//         const data = await pdfParse(buffer);

//         // The content
//         // console.log('Content: ', data.text); 
//         // console.log(uri.split('.pdf')[0])
//         const paths = uri.split('/')
//         const filename = paths[paths.length-1]
//         const p = uri.split(filename)[0]
//         fs.writeFileSync(p + 'textFiles/' + filename + '.txt', data.text)

      
//     }catch(err){
//         console.log(err)
        
//     }
// }

// (async () => {
//     for(var index = 0; index < files.length; index++){
//         const file = files[index]
        
//         if(file.endsWith('.pdf')){
//             await readPdf('/Users/jon/Documents/SYRF/sailing-data/assorted-and-skipped/orc_cert_pdfs/sailboatDataPdfs/' + file)
//         }
        
//     }
// })()

const files = fs.readdirSync('/Users/jon/Documents/SYRF/sailing-data/assorted-and-skipped/orc_cert_pdfs/textFiles');
const classes = {};
var numPolars = 0;
var measurers = [];
var classnames = [];
var designers = [];
var builders = [];


const certs = [];

(async () => {
    for(var index = 0; index < files.length; index++){
        const file = files[index]
        
        if(file.endsWith('.txt')){
            const data = fs.readFileSync('/Users/jon/Documents/SYRF/sailing-data/assorted-and-skipped/orc_cert_pdfs/textFiles/' + file, 'utf-8')
            const lines = data.split('\n')
            var className = ''
            var builderName = ''
            var designerName = ''
            var displacement = ''
            var loa = ''
            var mb = ''
            var draft = ''
            var cdl = ''
            var limitPositiveStability = ''
            var stabilityIndex = ''
            var lengthOverall = ''
            var maximumBeam = ''
            var gph = ''
            var measurer = ''
            var measurementDate = ''
            var vppVersion = ''
            var boatName = ''
            var sailNumber = ''
            var series = ''
            var age = ''
            var ageAllowance = ''
            
            var dynamicAllowance = ''
            var imsl = ''
            var rl = ''
            var vcgd = ''
            var vcgm = ''
            var sink = ''
            var ws = ''
            var lsm = ''
            // var timeOnDistanceOffshore = ''
            // var timeOnDistanceInshore = ''
            // var timeOnTimeOffshore = ''
            // var timeOnTimeInshore = ''
            var certNumber = ''
            var orcRef = ''
            var issuedDate = ''
            var validUntil = ''

        /** 

Dynamic Allowance0.180%
IMSL9.891m
RL9.328m
VCGD-0.231m
VCGM-0.122m
Sink18.28kg/mm
WS23.82m²
LSM09.548mDisplacement/Length ratio4.8378
HULL
COASTAL / LONG DISTANCEWINDWARD / LEEWARD
Time on Distance
582.3652.3
Time on Time
1.03041.0349
Triple NumberLowMediumHighLowMediumHigh
Time on Distance
691.9531.3470.3892.5653.5569.5
Time on Time
0.97561.27041.43540.75631.03291.1852
SCORING OPTIONS

Number261200
ORC RefAUS00001522
Issued On24/07/2018
VPP Ver.2018 1.00
Valid until30/06/2019
Certificate
Default644kg
Maximum680kg
Minimum*510kg
*when applied by the NoR and SI
Non Manual PwrNo
Crew Weight
Non Spin GPH
Non Spin OSN
ToD
643.4
622.4
ToT
0.9325
0.9640
Special Scoring
Headsails
5
Spinnakers
3
Sails Limitations
CDL =9.610
Class Division Length
Heavy Weather Jib31.03
Storm Jib (JL=9.85)11.49
Storm Trysail10.86
Storm Sails Areas

P13.175
IG14.978
ISP15.020
BAS1.648
FSP0.064
E4.709
J4.245
SFJ-0.010
SPL4.270
TPS5.750
MDT10.122
MDL10.180
MDT20.110
MDL20.147
TL1.900
MW0.132
GO0.183
BD0.171
MWT165.00
MCG4.545
RIG
N/A
MIZZEN RIG AND SAILS
0411701002
COMMENTS
Inclining TestCurrent Inclining
Flotation date26/03/2012SG1.0250
FFM1.330
FAM0.890
FF1.338
FA0.894
SFFP0.300
SAFP10.560
W119.0
W238.0
W357.0
W476.0
PD164.0
PD2128.0
PD3193.0
PD4257.0
WD11.680
GSA19.4
RSA6400.0
PLM2040.0
LCF from stem on CL / on sheer6.141 / 6.360
Maximum beam station from stem6.921
RM Measured122.8kg·m
RM Default111.8kg·m
Limit of positive stability / Stab.Index121.4° / 119.6
Freeboard at mast at 0.0001.096
INCLINING TEST AND FREEBOARDS
InstallationStrut
TypeFeathering 2 blades
Twin ScrewNo
PRD0.420
PBW0.104
PIPA0.0033
ST10.042
ST20.180
ST30.180
ST40.112
ST50.255
EDL1.637
PROPELLER
N/A
MOVABLE BALLAST
N/A
CENTERBOARD
 MainsailMHB
0.200
MUW
0.94
MTW
1.66
MHW
2.87
MQW
3.85
Area
35.70
Area (r)
36.30
  Formula
 P/8 · (E + 2·MQW+ 2·MHW + 1.5·MTW + MUW + 0.5·MHB)
 SymmetricSLU
14.86
SLE
14.86
SL
14.86
SHW
7.62
SFL
7.3493.67 SL · (SFL + 4·SHW) / 6
 AsymmetricSLU
15.92
SLE
14.86
SL
15.39
SHW
7.54
SFL
7.7097.11 AS · (SFL + 4·SHW) / 6
SAILS (Maximum Areas)
HHBHUWHTWHHWHQWHLPHLUAreaBtnFlyMeas.DateMaterialComment
0.020.691.182.163.114.0014.0229.63Y03/07/2018Unknow
0.020.671.172.123.073.9614.0529.30Y03/07/2018Unknow
HEADSAILS
  Area = 0.1125·HLU · (1.445·HLP + 2·HQW + 2·HHW + 1.5·HTW + HUW + 0.5·HHB)
MeasurerJ. Anderson 2015
Date26/03/2012
Comment
IdItemWeightDistanceVCGDescription
2Anchor30.04.90CQR + Chain
1Anchor14.04.90Danforth + Chain
1Tools12.07.501 Box
IdItemMakerModel
1EngineYanmar27hp
IdItemWeightDescription
1Deck Gear10.0Sheets
1Fwd Items10.0Deck Gear above
MEASUREMENT INVENTORY
IdItemTank UseTank TypeCapctyDist.VCGCondtnDescription
3TankFUELS/S90.08.3020.0
2TankWATERS/S90.05.500.0
1TankWATERS/S90.05.500.0
IdItemWeightDistanceVCGDescription
2Battery26.07.901 X 12v Sealed
1Battery26.07.501 X 12v Sealrd
MEASUREMENT INVENTORY
             */

            var hasPolars = false
            for(var lineCount = 0; lineCount < lines.length; lineCount++){
                var line = lines[lineCount]

              
                
                if(line.startsWith('Dynamic Allowance')){
                    dynamicAllowance = line.split('Dynamic Allowance')[1]
                }

                if(line.startsWith('Issued On')){
                    const date = line.split('Issued On')[1].split('/')
                    const dateValue = new Date('' + date[2] + '-' + date[1] + '-' + date[0] + 'T00:00:00')
                    issuedDate = dateValue.toUTCString()
                }
    
                if(line.startsWith('Valid until')){
                    const date = line.split('Valid until')[1].split('/')
                    const dateValue = new Date('' + date[2] + '-' + date[1] + '-' + date[0] + 'T00:00:00')
                    validUntil = dateValue.toUTCString()
                }

                if(line.startsWith('IMSL')){
                    imsl = line.split('IMSL')[1]
                }

                if(line.startsWith('VCGD')){
                    vcgd = line.split('VCGD')[1]
                }

                if(line.startsWith('VCGM')){
                    vcgm = line.split('VCGM')[1]
                }

                if(line.startsWith('Sink')){
                    sink = line.split('Sink')[1]
                }

                if(line.startsWith('WS')){
                    ws = line.split('WS')[1]
                }

                if(line.startsWith('RL')){
                    rl = line.split('RL')[1]
                }

                if(line.startsWith('LSM')){
                    lsm = line.split('LSM')[1]
                }

                if(line.startsWith('Number')){
                    certNumber = line.split('Number')[1]
                }

                if(line.startsWith('ORC Ref')){
                    orcRef = line.split('ORC Ref')[1]
                }

                if(line.startsWith('Name')){
                    boatName = line.split('Name')[1]
                }

                if(line.startsWith('Sail Nr')){
                    sailNumber = line.split('Sail Nr')[1]
                }

                if(line.startsWith('Series')){
                    series = line.split('Series')[1]
                }

                if(line.startsWith('Age Allowance')){
                    ageAllowance = line.split('Age Allowance')[1]
                }else if(line.startsWith('Age')){
                    age = line.split('Age')[1]
                }

                if(line.startsWith('Class') && !line.includes('Division Length') && ! line.startsWith('Class Rule') && !line.startsWith('Class Input') && !line.startsWith('Class-')){
                    className = formatClassName(line.split('Class')[1])
                    if(className !== '' && !classnames.includes(className)){
                        classnames.push(className)
                    }
                }

                
                if(line.startsWith('Builder') && !line.startsWith("Builder's displacement") && !line.startsWith("Builder's")){
                    // console.log(className)
                    builderName = line.split('Builder')[1].toLocaleLowerCase().trim()
                    if(builderName !== '' && !builders.includes(builderName)){
                        builders.push(builderName)
                    }
                    // lineCount++
                    // boatType = lines[lineCount].toLocaleLowerCase()
                   // classes[className].builders.push(line.split('Builder'))
                }   

                if(line.startsWith('Designer')){
                  //  console.log(className)
                    designerName = line.split('Designer')[1].toLocaleLowerCase().trim()
                    if(designerName !== '' && !designers.includes(designerName)){
                        designers.push(designerName)
                    }
                   // classes[className].builders.push(line.split('Builder'))
                }   
                
                if(line.startsWith('VPP Ver.')){
                    vppVersion = formatVersion(line.split('VPP Ver.')[1].toLocaleLowerCase())
                }

                if(line.startsWith('Wind Velocity')){
                    hasPolars = true
                }

                if(line.startsWith('MB')){
                    mb = formatMB(line.split('MB')[1])
                }

                if(line.startsWith('Displacement') && !line.startsWith('Displacement ') && !line.startsWith('Displacement,') && !line.startsWith('Displacement-')){
                    displacement = formatDisplacement(line.split('Displacement')[1])                    
                }

                if(line.startsWith('LOA')){
                    loa = formatLOA(line.split('LOA')[1])
                }

                if(line.startsWith('Draft') && !line.includes('wacht') && !line.includes('/') && !line.includes('Code')){
                    draft = formatMeters(line.split('Draft')[1])
           
                }

                if(line.startsWith('CDL =')){
                    cdl = parseFloat(line.split('CDL =')[1])
                 
                }

                if(line.startsWith('GPH')){
                    gph = lines[lineCount-1]

                }
                if(line.startsWith('Limit Positive Stab.:')){
                    limitPositiveStability = line.split('Limit Positive Stab.:')[1]
                }

                if(line.startsWith('Stability Index:')){
                    stabilityIndex = line.split('Stability Index:')[1]
                }

                if(line.startsWith('Length Overall')){
                    lengthOverall = formatMeters(line.split('Length Overall')[1])
                    
                }

                if(line.startsWith('Maximum Beam')){
                    maximumBeam = formatMeters(line.split('Maximum Beam')[1])
                  
                }
                if(line.startsWith('Measurement by')){
                    measurer = line.split('Measurement by')[1].split('-')[0].toLowerCase().replace('.','').trim()
                    if(measurer !== '' && !measurers.includes(measurer)){
                        measurers.push(measurer)
                    }
                    
                    measurementDate = line.split('Measurement by')[1].split('-')[1]
                 
                }
            }
            var timeAllowancesTemp = []
            var polarsTemp = []
            if(hasPolars){
                numPolars++
                // console.log(file)
                // for(var lineCount = 0; lineCount < lines.length; lineCount++){
                //     var line = lines[lineCount]
                //     console.log(line)
                // }
                for(var lineCount = 0; lineCount < lines.length; lineCount++){
                    var line = lines[lineCount]
                   
                    if(line.startsWith('Wind Velocity')){
                        timeAllowancesTemp.push(line)
                        for(var counter = 0; counter < 10; counter++){
                            lineCount++
                            line = lines[lineCount]
                            timeAllowancesTemp.push(line)
                        }
                        lineCount += 5
                        for(var counter = 0; counter < 13; counter++){
                            line = lines[lineCount]
                            polarsTemp.push(line)
                            lineCount++
                        }
                    }
                }
            }
      
            var timeAllowances = { windSpeeds:[], beatVMGs:[], timeAllowances:[], runVMGs:[]}
            
            for(var polarIndex = 0 ; polarIndex < timeAllowancesTemp.length ; polarIndex++){
                var line = timeAllowancesTemp[polarIndex]
                if(polarIndex === 0){
                    var windSpeeds = []
                    var speeds = line.split('Wind Velocity')[1].split(' kt')
                    speeds.forEach((speed)=>{
                        var s = parseInt(speed)
                        if(!isNaN(s)){
                            windSpeeds.push(parseFloat(s))
                        }
                    })
                    timeAllowances.windSpeeds = windSpeeds
                }else if(polarIndex === 1){
                   
                    var beatVMGString = line.split('Beat VMG')[1]
                    var beatVMGs = []
                    var currentVMG = ''
                    var numDecimals = 0
                    var startCounting = false
                    for (var i = 0; i < beatVMGString.length; i++) {
                        if(beatVMGString.charAt(i) === ','){
                            currentVMG = currentVMG + '.'
                        }else{
                            currentVMG = currentVMG + beatVMGString.charAt(i)
                        }
                        
                        if(startCounting){
                          numDecimals++   
                        }
                        if(numDecimals == 1){
                            startCounting = false
                            numDecimals = 0
                            beatVMGs.push(parseFloat(currentVMG))
                            currentVMG = ''
                        }

                        if(beatVMGString.charAt(i) === '.' || beatVMGString.charAt(i) === ',' ){
                            startCounting = true
                        }
                    }
                    timeAllowances.beatVMGs = beatVMGs
                }else if (polarIndex > 1 && polarIndex < 10){
                    var polarString = line.split('°')[1]
                    var twa = parseFloat(line.split('°')[0])
                    var speeds = []
                    var currentSpeed = ''
                    var numDecimals = 0
                    var startCounting = false
                    for (var i = 0; i < polarString.length; i++) {
                        if(polarString.charAt(i) === ','){
                            currentSpeed = currentSpeed + '.'
                        }else{
                            currentSpeed = currentSpeed + polarString.charAt(i)
                        }
                        
                        if(startCounting){
                          numDecimals++   
                        }
                        if(numDecimals == 1){
                            startCounting = false
                            numDecimals = 0
                            speeds.push(parseFloat(currentSpeed))
                            currentSpeed = ''
                        }

                        if(polarString.charAt(i) === '.' || polarString.charAt(i) === ','){
                            startCounting = true
                        }
                    }
                    timeAllowances.timeAllowances.push({twa: twa, speeds: speeds})
                }else if(polarIndex == 10){
                    var runVMGString = line.split('Run VMG')[1]
                    var runVMGs = []
                    var currentVMG = ''
                    var numDecimals = 0
                    var startCounting = false
                    for (var i = 0; i < runVMGString.length; i++) {
                        if(runVMGString.charAt(i) === ','){
                            currentVMG = currentVMG + '.'
                        }else{
                            currentVMG = currentVMG + runVMGString.charAt(i)
                        }
                        
                        if(startCounting){
                          numDecimals++   
                        }
                        if(numDecimals == 1){
                            startCounting = false
                            numDecimals = 0
                            runVMGs.push(parseFloat(currentVMG))
                            currentVMG = ''
                        }

                        if(runVMGString.charAt(i) === '.' || runVMGString.charAt(i) === ',' ){
                            startCounting = true
                        }
                        timeAllowances.runVMGs = runVMGs
                    }
                }
            }

            var polars = {windSpeeds:[], beatAngles:[], beatVMGs:[], polars:[], runVMGs:[], gybeAngles:[]}
            for(var polarIndex = 0 ; polarIndex < polarsTemp.length ; polarIndex++){
                var line = polarsTemp[polarIndex]
                if(polarIndex == 0){
                    var windSpeeds = []
                    var speeds = line.split('Wind Velocity')[1].split(' kt')
                    speeds.forEach((speed)=>{
                        var s = parseInt(speed)
                        if(!isNaN(s)){
                            windSpeeds.push(s)
                        }
                    })
                    polars.windSpeeds = windSpeeds
                }else if(polarIndex === 1){
                    var beatAngles = line.split('Beat Angles')[1].split('°')
                    var beatAnglesDegrees = []
                    beatAngles.forEach(a => {
                        var s = parseFloat(a.replace(',', '.'))
                   
                        if(! isNaN(s)){
                            beatAnglesDegrees.push(s)
                        }
                    })
                    polars.beatAngles = beatAnglesDegrees
                }else if(polarIndex === 2){
                    var beatVMGString = line.split('Beat VMG')[1]
                    var beatVMGs = []
                    var currentVMG = ''
                    var numDecimals = 0
                    var startCounting = false
                    for (var i = 0; i < beatVMGString.length; i++) {
                        if(beatVMGString.charAt(i) === ','){
                            currentVMG = currentVMG + '.'
                        }else{
                            currentVMG = currentVMG + beatVMGString.charAt(i)
                        }
                        
                        if(startCounting){
                          numDecimals++   
                        }
                        if(numDecimals == 2){
                            startCounting = false
                            numDecimals = 0
                            beatVMGs.push(parseFloat(currentVMG))
                            currentVMG = ''
                        }

                        if(beatVMGString.charAt(i) === '.' || beatVMGString.charAt(i) === ',' ){
                            startCounting = true
                        }
                    }
                    polars.beatVMGs = beatVMGs
            
                }else if (polarIndex > 2 && polarIndex < 11){
                    var polarString = line.split('°')[1]
                    var twa = parseFloat(line.split('°')[0])
                    var speeds = []
                    var currentSpeed = ''
                    var numDecimals = 0
                    var startCounting = false
                    for (var i = 0; i < polarString.length; i++) {
                        if(polarString.charAt(i) === ','){
                            currentSpeed = currentSpeed + '.'
                        }else{
                            currentSpeed = currentSpeed + polarString.charAt(i)
                        }
                        
                        if(startCounting){
                          numDecimals++   
                        }
                        if(numDecimals == 2){
                            startCounting = false
                            numDecimals = 0
                            speeds.push(parseFloat(currentSpeed))
                            currentSpeed = ''
                        }

                        if(polarString.charAt(i) === '.' || polarString.charAt(i) === ','){
                            startCounting = true
                        }

                    }
                   
                    polars.polars.push({twa: twa, speeds: speeds})
                }else if(polarIndex == 11){
                    var runVMGString = line.split('Run VMG')[1]
                    var runVMGs = []
                    var currentVMG = ''
                    var numDecimals = 0
                    var startCounting = false
                    for (var i = 0; i < runVMGString.length; i++) {
                        if(runVMGString.charAt(i) === ','){
                            currentVMG = currentVMG + '.'
                        }else{
                            currentVMG = currentVMG + runVMGString.charAt(i)
                        }
                        if(startCounting){
                          numDecimals++   
                        }
                        if(numDecimals == 2){
                            startCounting = false
                            numDecimals = 0
                            runVMGs.push(parseFloat(currentVMG))
                            currentVMG = ''
                        }

                        if(runVMGString.charAt(i) === '.' || runVMGString.charAt(i) === ',' ){
                            startCounting = true
                        }
                        polars.runVMGs = runVMGs
                    }
                }else if(polarIndex == 12){
                    var gybeAngles = line.split('Gybe Angles')[1].split('°')
                    var gybeAnglesDegrees = []
                    gybeAngles.forEach(a => {
                        var s = parseFloat(a.replace(',', '.'))
                        if(! isNaN(s)){
                            gybeAnglesDegrees.push(parseFloat(s))
                        }
                    })
                    polars.gybeAngles = gybeAnglesDegrees
                }
            }

            certs.push({name:file, displacementKg:displacement, loaM:loa, mbM:mb, 
                draftM:draft, cdl:cdl, lps:limitPositiveStability, 
                si:stabilityIndex, loM:lengthOverall, maxBM:maximumBeam, 
                gph:gph, measurementDate: measurementDate, measurer:measurer, 
                hasPolars:hasPolars, polars:polars, timeAllowances: timeAllowances, 
                vppVersion: vppVersion, sailNumber:sailNumber, boatName:boatName, 
                series:series, ageAllowance:ageAllowance, age:age, dynamicAllowance:dynamicAllowance, 
                imsl:imsl, rl:rl, vcgd:vcgd, vcgm:vcgm, sink:sink, ws:ws, lsm:lsm, certNumber:certNumber, 
                orcRef:orcRef, issuedDate:issuedDate, validUntil:validUntil, className:className,
                 designerName:designerName, builderName:builderName})

          
            /**
             * PRD0.400
                PIPA0.0039
                 MainsailMHB
                0.270
                MUW
                1.56
                MTW
                2.75
                MHW
                4.48
                MQW
                5.64
                Area
                76.32
                Area (r)
                78.26
                Formula
                P/8 · (E + 2·MQW+ 2·MHW + 1.5·MTW + MUW + 0.5·MHB)
                SymmetricSLU
                18.59
                SLE
                18.59
                SL
                18.59
                SHW
                10.07
                SFL
                9.78155.10 SL · (SFL + 4·SHW) / 6
                AsymmetricSLU
                18.96
                SLE
                17.96
                SL
                18.46
                SHW
                8.56
                SFL
                9.75135.34 AS · (SFL + 4·SHW) / 6
                10.6
                GPH
                PROPELLER
                Inclining TestCurrent Inclining
            Flotation date26/04/2013SG1.0230
            FFM1.489
            FAM1.188
            FF1.490
            FA1.189
            SFFP0.295
            SAFP13.301
            W1103.0
            W2103.0
            W3103.0
            W4103.0
            PD1427.0
            PD2427.0
            PD3427.0
            PD4427.0
            WD14.100
            GSA1.0
            RSA1.0
            PLM9000.0
            LCF from stem on CL / on sheer7.686 / 7.918
            Maximum beam station from stem8.935
            RM Measured267.8kg·m
            RM Default269.0kg·m
            Limit of positive stability / Stab.Index135.8° / 142.7
            Freeboard at mast at 5.4351.267
            INCLINING TEST AND FREEBOARDS
            InstallationStrut
            TypeFolding 2 blades
            Twin ScrewNo
            PRD0.425
            PBW0.108
            PIPA0.0033
            ST10.048
            ST20.170
            ST30.170
            ST40.098
            ST50.330
            EDL2.770
            PROPELLER
                Data FileISR380
                NameJEROBOAM
                Sail NrUSA 61017
                Offset FileELAN380.OFF
              
             */
            // if(! classes[className].types.includes(boatType)){
            //     classes[className].types.push(boatType)
            // }
        }
    }

   fs.writeFileSync('/Users/jon/Documents/SYRF/sailing-data/assorted-and-skipped/orc_cert_pdfs/textFiles/certs_from_orc_pdfs.json', JSON.stringify(certs))
    
 

   // fs.writeFileSync('/Users/jon/Documents/SYRF/sailing-data/assorted-and-skipped/orc_cert_pdfs/names.json', JSON.stringify({classes:classnames, designers:designers, builders:builders, measurers:measurers}))
    // var items = Object.keys(classes).map(function(key) {
    //     return [key, classes[key].polarCount, classes[key]];
    //   });
      
    // // Sort the array based on the second element
    // items.sort(function(first, second) {
    //     return second[1] - first[1];
    // });
      
    // Create a new array with only the first 5 items
   // console.log(items.slice(0, 10));
    // var i = 0
    // items.forEach((item)=>{
    //     if(i < 100){
    //         console.log(item[0])
    //         if(item[0] === ''){
    //             console.log(item)
    //         }
    //     }
    //    i++
    // })

   
})()

