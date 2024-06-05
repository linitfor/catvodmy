import req from '../../util/req.js';

async function init(_inReq, _outResp) {
    return {};
}

async function support(_inReq, _outResp) {
    // const clip = inReq.body.clip;
    return 'true';
}

async function detail(inReq, _outResp) {
    const ids = !Array.isArray(inReq.body.id) ? [inReq.body.id] : inReq.body.id;
    const videos = [];
    for (const id of ids) {
        let vod = {
            vod_id: id,
            vod_content: '',
            vod_name: id,
            vod_pic: 'https://pic.rmb.bdstatic.com/bjh/1d0b02d0f57f0a42201f92caba5107ed.jpeg',
        };
        vod.vod_play_from = '推送';
        vod.vod_play_url = '测试$' + id;
        videos.push(vod);
    }
    return {
        list: videos,
    };
}

async function sniff(inReq, outResp) {
    if (inReq.body.action == 'request') {
        if (inReq.body.url.indexOf('.html') > 0 || inReq.body.url.indexOf('url=') > 0) {
            const resp = await req.get(inReq.body.url, {
                headers: inReq.body.headers,
            });
            const respHeaders = resp.headers.toJSON();
            delete respHeaders['transfer-encoding'];
            delete respHeaders['cache-control'];
            delete respHeaders['content-length'];
            if (respHeaders['content-encoding'] == 'gzip') {
                delete respHeaders['content-encoding'];
            }
            outResp.headers(respHeaders);
            return resp.data
                .replaceAll(`var p = navigator.platform;`, `var p ='';`)
                .replaceAll(
                    `</html>`,
                    `<script>
            const loop1 = setInterval(function () {
              if (
                document.querySelectorAll('[onclick*=playlist]').length > 0 &&
                window.playlist
              ) {
                clearInterval(loop1);
                document.querySelectorAll('[onclick*=playlist]')[0].click();
                return;
              }
            }, 200);</script></html>`
                )
                .replaceAll(`autoplay: false`, `autoplay: true`)
                .replaceAll(`<video`, `<video autoplay=true `);
        } else if (inReq.body.url.indexOf('video_mp4') > 0) {
            outResp.header('sniff_end', '1');
            return 'block';
        }
    }
    return '';
}

async function play(inReq, _outResp) {
    // const flag = inReq.body.flag;
    const id = inReq.body.id;
    if (id.startsWith('https://v.nmvod.cn/vod-play')) {
        const sniffer = await inReq.server.messageToDart({
            action: 'sniff',
            opt: {
                ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
                url: id,
                timeout: 10000,
                // rule and intercept parameters conflict, only one can be used
                // rule: 'xxxxxxx'
                intercept: inReq.server.address().url + inReq.server.prefix + '/sniff',
            },
        });
        if (sniffer && sniffer.url) {
            return {
                parse: 0,
                url: sniffer.url,
            };
        }
    }
    return {
        parse: 0,
        url: id,
    };
}

async function test(inReq, outResp) {
    try {
        const printErr = function (json) {
            if (json.statusCode && json.statusCode == 500) {
                console.error(json);
            }
        };
        const prefix = inReq.server.prefix;
        const dataResult = {};
        let resp = await inReq.server.inject().post(`${prefix}/support`).payload({
            clip: 'https://xx.xx/1.m3u8',
        });
        dataResult.support = resp.json();
        printErr(resp.json());
        resp = await inReq.server.inject().post(`${prefix}/detail`).payload({
            id: 'https://xx.xx/1.m3u8',
        });
        dataResult.detail = resp.json();
        printErr(resp.json());
        resp = await inReq.server.inject().post(`${prefix}/play`).payload({
            flag: 'xx',
            id: 'https://xx.xx/1.m3u8',
        });
        dataResult.play = resp.json();
        printErr(resp.json());
        return dataResult;
    } catch (err) {
        console.error(err);
        outResp.code(500);
        return { err: err.message, tip: 'check debug console output' };
    }
}

export default {
    meta: {
        key: 'push',
        name: '推送',
        type: 4,
    },
    api: async (fastify) => {
        fastify.post('/init', init);
        fastify.post('/support', support);
        fastify.post('/detail', detail);
        fastify.post('/play', play);
        fastify.post('/sniff', sniff);
        fastify.get('/test', test);
    },
};
