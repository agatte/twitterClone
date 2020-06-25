const functions = require('firebase-functions');
const admin = require('firebase-admin');
//initalize
const app = require('express')();

// don't need to pass ID -> gotten from .firebaserc
admin.initializeApp();

// Can't store info about users in auth
// manually add collection of users (need to add later)

const config = {
        apiKey: "AIzaSyDbd9LiobiL53WEEv87uW4EfUeAaY5YakU",
        authDomain: "twitterclone-b1d30.firebaseapp.com",
        databaseURL: "https://twitterclone-b1d30.firebaseio.com",
        projectId: "twitterclone-b1d30",
        storageBucket: "twitterclone-b1d30.appspot.com",
        messagingSenderId: "752459412435",
        appId: "1:752459412435:web:6a88b836c8e8ed43133526",
        measurementId: "G-W9VZR8JYWT"
};

const firebase = require('firebase');
firebase.initializeApp(config);

// Get documents from firebase
// Check GET request with Postman
// Use express for cleaner code + don't have to check to see if user is posting on a GET req, etc.

// Error: Could not handle the request (408 request timeout error)
// Worked after deploying but not on local machine
app.get('/posts', (req, res) => {
    admin 
        .firestore()
        .collection('posts')
        .orderBy('createdAt', 'desc')
        .get()
        .then((data) => {
            let posts = [];
            data.forEach((doc) => {
                posts.push({
                    //...doc.data()
                    postId: doc.id,
                    body: doc.data().body,
                    userHandle: doc.data().userHandle,
                    createdAt: doc.data().createdAt,
                    commentCount: doc.data().commentCount,
                    likeCount: doc.data().likeCount
                });
            });
            return res.json(posts);
        })
        .catch((err) => console.error(err));
});

app.post('/post', (req, res) => {
    // Checks to see if 'user' tries to do anything other than 'post' on a post request
    const newPost = {
        body: req.body.body, 
        userHandle: req.body.userHandle,
        createdAt: new Date().toISOString()
    };

    admin.firestore()
        .collection('posts')
        .add(newPost)
        .then(doc => {
            res.json({ message: `document ${doc.id} created successfully`});
        })
        .catch(err => {
            // getting error Could not load the default credentials
            // Functions: The Cloud Firestore emulator is not running, so calls to Firestore 
            // will affect production.
            // Works if 'deploying' but not serving from local machine...

            // server error
            res.status(500).json({error: 'something went wrong'});
            console.error(err);
        });
   });

// https://myurl.com/api/
// want /api   

//signup route
app.post('/signup', (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle,
    };

    // TODO: Validate data

    firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
    .then(data => {
        return res.status(201).json({ message: `user ${data.user.uid} signed up successfully`});
    })
    .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code });
    });
});

// turns into multiple routes
exports.api = functions.https.onRequest(app);
