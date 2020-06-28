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
require('./node_modules/firebase/firebase-auth');
firebase.initializeApp(config);

const db = admin.firestore();

// Get documents from firebase
// Check GET request with Postman
// Use express for cleaner code + don't have to check to see if user is posting on a GET req, etc.

// Error: Could not handle the request (408 request timeout error)
// Worked after deploying but not on local machine
app.get('/posts', (req, res) => {
    db
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

// Authentication
const FireBaseAuth = (req, res, next) => {
    let idToken;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')){
        idToken = req.headers.authorization.split('Bearer ')[1];
    } else {
        console.error('No token found')
        return res.status(403).json({ error: 'Unauthorized'})
    }

    admin.auth().verifyIdToken(idToken)
        .then(decodedToken => {
            req.user = decodedToken;
            console.log(decodedToken);
            return db.collection('users')
            .where('userId', '==', req.user.uid)
            .limit(1)
            .get;
        })
        .then(data => {
            req.user.handle = data.docs[0].data().handle;
            return next();
        })
        .catch(err => {
            console.error('Error while verifying token ', err);
            return res.status(403).json(err);
        })
}

// handles posts
app.post('/post', FireBaseAuth, (req, res) => {
    if (req.body.body.trim() === '') {
        return res.status(400).json({ body: 'Body must not be empty' });
    }

    const newPost = {
        body: req.body.body, 
        userHandle: req.user.handle,
        createdAt: new Date().toISOString()
    };

    db.collection('posts')
        .add(newPost)
        .then((doc) => {
            res.json({ message: `document ${doc.id} created successfully` });
        })
        .catch((err) => {
            // getting error Could not load the default credentials
            // Functions: The Cloud Firestore emulator is not running, so calls to Firestore 
            // will affect production.
            // Works if 'deploying' but not serving from local machine...
                // ran $ npm install -unsafe-perm -g firebase-tools and local works!!!

            // server error
            res.status(500).json({error: 'something went wrong'});
            console.error(err);
        });
   });

   /*const isEmail = (email) => {
       const regEx = 
   }
*/
   const isEmpty = (string) => {
       if(string.trim() === '') return true;
       else return false;
   }

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

    let errors = {};

    if(isEmpty(newUser.email)) {
        errors.email = 'Must not be empty'
    } else if(!isEmail(newUser.email)){
        errors.email = 'Must be a valid email'
    }

    if(isEmpty(newUser.password)) errors.password = 'Must not be empty'
    if(newUser.password !== newUser.confirmPassword) errors.confirmPassword = 'Passwords must match';
    if(isEmpty(newUser.handle)) errors.handle = 'Must not be empty'

    if(Object.keys(errors).length > 0) return res.status(400).json (errors);

    // TODO: Validate data
    let token, userId;
    db.doc(`/users/${newUser.handle}`)
    .get()
    .then(doc => {
        if(doc.exists){
            return res.status(400).json({ handle: 'this handle is already taken'});
        } else {
            return firebase
            .auth()
            .createUserWithEmailAndPassword(newUser.email, newUser.password);
        }
    })
    .then(data => {
        userId = data.user.uid;
        return data.user.getIdToken();
    })
    .then(idToken => {
        token = idToken;
        const userCredentials = {
            handle: newUser.handle,
            email: newUser.email,
            createdAt: new Date().toISOString(),
            userId
        };
        return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
        return res.status(201).json({ token });
    })
    .catch(err => {
        console.error(err);
        if(err.code === 'auth/email-already-in-use'){
            return res.status(400).json({ email: 'Email is already in use'})
        } else {
            return res.status(500).json({ error: err.code});
        }
    });
});

app.post('/login', (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    };

    let errors = {};

    if(isEmpty(user.email)) errors.email = 'Must not be empty';
    if(isEmpty(user.password)) errors.password = 'Must not be empty';

    if(Object.keys(errors).length > 0) return res.status(400).json(errors);

    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
        .then(data => {
            return data.user.getIdToken();
        })
        .then(token => {
            return res.json({token});
        })
        .catch(err => {
            console.error(err);
            if(err.code === 'auth/wrong-password'){
                return res.status(403).json({ general: 'Wrong password. Please try again'});
            } else return res.status (500).json({ error: err.code });
            return res.status(500).json({ error: err.code });
        });
});

// turns into multiple routes
exports.api = functions.https.onRequest(app);
