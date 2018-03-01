"use strict";
var express = require('express');
var router = express.Router();
var redis = require('redis');
var co = require('co');
var wrapper = require('co-redis');
var redisClient = redis.createClient('6379', '47.94.251.202');
redisClient.auth("123");
redisClient.select('10', function (error) {
    return !error;
});
var redisCo = wrapper(redisClient);
var superagent = require('superagent');
var cheerio = require('cheerio');
var api_host = 'http://47.94.251.202/nodejs';
var USER_LIMIT=150;
/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index');
});


router.get('/result', function (req, res, next) {
    let user_id = req.param('id');
    let user_name = req.param('name');
    try {
        let limit = req.param('limit');
        if (1 < parseInt(limit) < 200) {
            USER_LIMIT = limit
        }
        else {
            USER_LIMIT = 1
        }
    }
    catch(err) {
        console.log(user_name);
    }
    co(function* () {
        let init_likesongs = yield redisCo.scard('user:' + user_id + ':like_songs');
        console.log('fuck' + init_likesongs.toString());
        if (init_likesongs != 0) {
            console.log('fuck you' + init_likesongs.toString());

            var user_list = yield redisCo.srandmember('co_ori_users', USER_LIMIT);
            var weight_items = {};
            for (let i = 0; i < user_list.length; i++) {
                let comb_id = user_list[i];
                let comb_name = yield redisCo.hget('user:' + comb_id, 'name');
                let weight = yield redisCo.sinterstore(user_id + ':combine:' + comb_id, 'user:' + user_id + ':like_songs', 'user:' + comb_id + ':like_songs');
                if (weight) {
                    weight_items[comb_name] =
                        {
                            id: comb_id,
                            value: weight
                        }

                }
                else {

                }
            }
            // var name = yield redisCo.hget('user:'+user_id,'name');
            console.log(weight_items);
            res.render('result', {data: weight_items, test: 1, user_id: user_id, user_name: user_name});
        }
        else {
            console.log('fuck me' + init_likesongs.toString());

            let err,
                sres = yield superagent.get('http://music.163.com/api/user/playlist/?offset=&limit=1&uid=' + user_id)
                    .set('Content-Type', 'application/json');

            let result = JSON.parse(sres.text);
            let playlist_id = result['playlist'][0]['id'];
            err, sres = yield superagent.get('http://music.163.com/playlist?id=' + playlist_id);

            // 常规的错误处理
            let $ = cheerio.load(sres.text);
            // sres.text 里面存储着网页的 html 内容，将它传给 cheerio.load 之后
            // 就可以得到一个实现了 jquery 接口的变量，我们习惯性地将它命名为 `$`
            // 剩下就都是 jquery 的内容了

            $('ul.f-hide li').each(function (idx, element) {
                let href = $(element).find('a');
                href = href.attr('href');
                href = href.substring(9);
                redisCo.sadd('user:' + user_id + ":like_songs", href);
                console.log(href)
            });

            var user_list = yield redisCo.srandmember('co_ori_users', USER_LIMIT);
            var weight_items = {};

            for (let i = 0; i < user_list.length; i++) {
                let comb_id = user_list[i];
                let comb_name = yield redisCo.hget('user:' + comb_id, 'name');
                let weight = yield redisCo.sinterstore(user_id + ':combine:' + comb_id, 'user:' + user_id + ':like_songs', 'user:' + comb_id + ':like_songs');
                if (weight) {
                    weight_items[comb_name] =
                        {
                            id: comb_id,
                            value: weight
                        }

                }
                else {

                }
            }
            // var name = yield redisCo.hget('user:'+user_id,'name');
            console.log(weight_items);
            res.render('result', {data: weight_items, test: 1, user_id: user_id, user_name: user_name});
        }


    });


});

router.post('/', function (req, res, next) {
    let user_name = req.body.user_name;
    console.log(req.body.user_name);

    co(function* () {
        let api_url = api_host+'/search?keywords=' + encodeURI(user_name) + '&type=1002&limit=5';

        let err, sres = yield superagent.get(api_url)
            .set('Content-Type', 'application/json');
        if (err) {
            res.render('results', {test: 'error'});
        }
        let result = JSON.parse(sres.text);
        let user_id = result['result']['userprofiles'][0]['userId'];
        console.log(user_id);


        res.json({'data': result['result']['userprofiles'], 'status': true})

    });


});

async function getUserId(user_name) {
    let api_url = api_host+'/search?keywords=' + user_name + '&type=1002&limit=1';
    superagent.get(api_url)
        .set('Content-Type', 'application/json')
        .end(function (err, sres) {
            // 常规的错误处理
            if (err) {
                return next(err);
            }
            let result = JSON.parse(sres.text);
            let user_id = result['result']['userprofiles'][0]['userId'];
            console.log(user_id);
            return user_id;
        });
}


module.exports = router;


function getUserLikeSongs(user_id) {
    superagent.get('http://music.163.com/api/user/playlist/?offset=&limit=1&uid=' + user_id)
        .set('Content-Type', 'application/json')
        .end(function (err, sres) {
            // 常规的错误处理
            if (err) {
                return next(err);
            }
            let result = JSON.parse(sres.text);
            let playlist_id = result['playlist'][0]['id'];
            superagent.get('http://music.163.com/playlist?id=' + playlist_id)
                .end(function (err, sres) {
                    // 常规的错误处理
                    if (err) {
                        return next(err);
                    }
                    let $ = cheerio.load(sres.text);
                    // sres.text 里面存储着网页的 html 内容，将它传给 cheerio.load 之后
                    // 就可以得到一个实现了 jquery 接口的变量，我们习惯性地将它命名为 `$`
                    // 剩下就都是 jquery 的内容了

                    $('ul.f-hide li').each(function (idx, element) {
                        let href = $(element).find('a');
                        href = href.attr('href');
                        href = href.substring(9);
                        redisCo.sadd('user:' + user_id + ":like_songs", href);
                        console.log(href)
                    });
                    redisClient.quit();

                });
        });
}

function interLikeSongs(user_id) {
    co(function* () {
        let user_name = yield redisCo.hget('user:' + user_id, 'name');
        var user_list = yield redisCo.srandmember('co_ori_users', 1);
        var weight_items = {};
        for (let i = 0; i < user_list.length; i++) {
            let comb_id = user_list[i];
            let comb_name = yield redisCo.hget('user:' + comb_id, 'name');
            let weight = yield redisCo.sinterstore(user_id + ':combine:' + comb_id, 'user:' + user_id + ':like_songs', 'user:' + comb_id + ':like_songs');
            if (weight) {
                weight_items[comb_name] =
                    {
                        id: comb_id,
                        value: weight
                    }

            }
            else {
                weight_items[comb_name] =
                    {
                        id: comb_id,
                        value: weight
                    }
            }
        }
        // var name = yield redisCo.hget('user:'+user_id,'name');
        console.log(weight_items);
        res.render('index', {data: weight_items, test: 1, user_id: user_id, user_name: user_name});

    });

}

function getUserRelation(user_id) {
    co(function* () {
        var keys = yield redisCo.keys('*:combine:*');
        for (let i = 0; i < keys.length; i++) {
            let keyname = keys[i];
            let re = keyname.match(/:\d+/).toString().substring(1);
            console.log(re);
            redisClient.quit();

            return re;


        }

        // var user_list =  yield redisCo.srandmember('co_users', 100);

    });
}
