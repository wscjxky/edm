"use strict";
var express = require('express');
var router = express.Router();
var redis = require('redis');
var co = require('co');
var wrapper = require('co-redis');
var redisClient = redis.createClient('6379', '47.94.251.202');
redisClient.auth("wscjxky");
redisClient.select('10', function (error) {
    return !error;
});
var redisCo = wrapper(redisClient);
var superagent = require('superagent');
var cheerio = require('cheerio');

/* GET home page. */
router.get('/', function (req, res, next) {
    let user_id = 100055648;
    // getUserInfo(user_id);
    let re = interLikeSongs(user_id);
    // let re = getUserRelation(user_id);
    co(function* () {
        var user_list = yield redisCo.srandmember('co_users', 100);
        var weight_items = {};
        for (let i = 0; i < user_list.length; i++) {
            let comb_id = user_list[i];
            let weight = yield redisCo.sinterstore(user_id + ':combine:' + comb_id, 'user:' + user_id + ':like_songs', 'user:' + comb_id + ':like_songs');
            if (weight) {
                weight_items[comb_id] = weight;
            }
            else {}

        }
        res.render('index', {data: weight_items});

    });
});
router.post('/', function (req, res, next) {
    console.log(req.body.user_id);
    co(function* () {
        var data = yield redisCo.set('test', 33);
        data = yield redisCo.get('test'); // logs 33
        redisClient.quit();
        res.json({'data': data, 'status': true})
    });
});

module.exports = router;

function getUserInfo(user_id) {
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
                    });
                    redisClient.quit();

                });

            console.log(playlist_id)
        });
}

function interLikeSongs(user_id) {

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