const express = require('express');
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const gravatar = require("gravatar");
const key = require("../../config/key");
const passport = require('passport');

const User = require("../../models/User");
// $router POST /api/user/register
router.post("/register/step1", (req, res) => {
    // Check existing email 
    User.findOne({ email: req.body.email })
        .then((user) => {
            if(user) {
                return res.status(400).json("Email already been used");
            } else {
                // store user in newUser object
                const avatar = gravatar.url(req.body.email, {s: '64', r: 'pg', d:'mm'}); 
                const newUser = new User({
                    name: req.body.name,
                    username: req.body.username,
                    email: req.body.email,
                    avatar,
                    hash_password: req.body.password
                });
                // hash the password and store
                bcrypt.genSalt(10, function(err, salt) {
                    bcrypt.hash(newUser.hash_password, salt, (err, hash) => {
                        // Store hash in your password DB.
                        if(err) throw err;
                        
                        newUser.hash_password = hash;
                        newUser.save()
                            .then(user => res.json({
                                id: user._id
                            }))
                            .catch(err => {
                                console.log(err)
                                res.json('Register Failed')
                            });
                    });
                });
            }
        })
});

// $router post /api/users/register/step2
router.post("/register/step2", (req, res) => {
    console.log(req.body)
    User.findById(req.body.id)
        .then(user => {
            if(!user) {
                return res.status(400).json('User not exist')
            }
            user.hobbies = req.body.hobbies
            user.save()
                .then(user => {
                    console.log(user)
                    res.json('Register Finished')
                })
                .catch(err => {
                    console.log(err)
                    res.json('Error occured')
                })
        })
})

// $router Post /api/user/login
router.post("/login", (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    // find user
    User.findOne({email})
        .then(user => {
            if(!user){
                return res.status(404).json('User is not exist')
            }

            // Load hash from your password DB.
            bcrypt.compare(password , user.hash_password)
                .then(isMatch =>  {
                    if(isMatch) {
                        const rule = {id:user.id, name: user.name, avatar: user.avatar};
                        jwt.sign(rule, key.secretKey, {expiresIn: 7200}, (err, token) => {
                            if(err) throw err;
                            res.json({
                                success: true,
                                token: "Bearer " + token
                            });
                        });
                    } else {
                        return res.status(400).json("Password is not correct");
                    }
                });
        });
})

//$router /api/user/current
router.get("/current", passport.authenticate("jwt", {session: false}), (req, res) => {
    res.json({
        id: req.user.id,
        name: req.user.name,
        username: req.user.username,
        email: req.user.email,
        avatar: req.user.avatar,
    });
}) 

router.get("/count", (req, res)=> {
    User.count({}, function(err, c) {
        if(err) res.status(500).json("count error")

        res.json(c)
    })
})

module.exports = router;