const { firebaseApp } = require('./Database');

const root = firebaseApp.database().ref();

// Find a user by UID
const oneRef = root.child('users').child(1);

// Find a user by email
const twoRef = root.child('users').orderByChild('email').equalTo('example@email.com');

// Limit to 10 users
const threeRef = root.child('users').limitToFirst(10);

// Get all users name starts with D
const fourRef = root.child('users').orderByChild('name').startAt('D')
	.endAt('D\uf8ff');

// Get all users ages who are less than 50
const fiveRef = root.child('users').orderByChild('age').endAt(49);

// Get all users ages who are greater than 50
const sixRef = root.child('users').orderByChild('age').startAt(51);

// Get all users who are between 20 to 50
const sevenRef = root.child('users').orderByChild('age').startAt(20)
	.endAt(50);

