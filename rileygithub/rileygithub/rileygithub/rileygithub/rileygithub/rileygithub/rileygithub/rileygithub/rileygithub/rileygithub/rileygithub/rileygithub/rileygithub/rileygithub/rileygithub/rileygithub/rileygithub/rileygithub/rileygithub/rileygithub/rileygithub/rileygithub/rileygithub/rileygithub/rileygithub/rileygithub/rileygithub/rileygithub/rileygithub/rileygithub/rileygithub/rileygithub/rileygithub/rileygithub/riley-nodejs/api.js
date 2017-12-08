var express = require('express');
var router = express.Rourter();

router.get('/products', function (req,res) {
    res.send("API is work");
})
module.exports = router;