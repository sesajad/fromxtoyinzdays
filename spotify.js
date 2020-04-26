const axios = require('axios');
var moment = require('moment');
var fs = require('fs');

const VEC_PARAMS = ["energy", "valence"];

const CLIENT_AUTH = 'Basic ' + new Buffer(fs.readFileSync('DATA', 'utf8').trim()).toString('base64');;
var authorization = null;

async function authorize() {
    if (!authorization || authorization.expire < moment().unix()) {
        const res = await axios.post("https://accounts.spotify.com/api/token", "grant_type=client_credentials", {
            headers: {
                Authorization: CLIENT_AUTH,
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        });
        authorization = {
            header: { "Authorization": "Bearer " + res.data.access_token},
            expire: moment().unix() + 3500, // its 3600 btw
        }
        console.log('hooray!', authorization);
    }
}

async function generateDays(startSeed, endSeed, days) {
    await authorize();

    console.log("Initiating...");

    const res = await axios.get("https://api.spotify.com/v1/audio-features/",  {
        headers: authorization.header,
        params: {
            "ids": `${startSeed.id},${endSeed.id}`
        }
    });
    const startVec = VEC_PARAMS.map(v => res.data.audio_features[0][v]);
    const endVec = VEC_PARAMS.map(v => res.data.audio_features[1][v]);

    const retVal = { days : [] };

    const vecs = [];
    for (let d = 0; d < days; d ++) {
        let vec = []
        for (let i = 0; i < VEC_PARAMS.length; i ++) {
            vec.push(startVec[i] * (days - 1 - d) / (days - 1) + endVec[i] * d / (days - 1));
        }
        vecs.push(vec);
        
        retVal.days.push({ mood : Object.assign(...VEC_PARAMS.map((x, i) => { return {[x] : vecs[d][i]} }))});
    }
    
    console.log("Features are calculated per each day.");

    for (let d = 0; d < days; d ++) {
        const targetParams = Object.assign(...VEC_PARAMS.map((x, i) => { return {[`target_${x}`] : vecs[d][i]} }));
        const res = await axios.get("https://api.spotify.com/v1/recommendations/",  {
            headers: authorization.header,
            params: Object.assign(targetParams, {
                "seed_tracks": `${startSeed.id},${endSeed.id}`,
                "limit": 10,
            })
        });

        console.log(`Creating playlist for day ${d + 1}...`);
        retVal.days[d].tracks = res.data.tracks.map(x => { return {
            url: x.href, 
            name: x.name, 
            artist: x.artists.map(x => x.name).join(", "), 
            album: { 
                name : x.album.name, 
                imageUrl : x.album.images[0].url
            }
        }});
    }
    
    console.dir(retVal, { depth: null } );
    return retVal;
}

module.exports =  generateDays;

// example: generateDays({ id : "0ox2hIM7BG4fcnu2kWPx0n" }, { id : "57YSF5rP2vEVoX2bpAxQw7"}, 3).catch(x => console.log("Oops", x.stack));