const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
const ejs = require('ejs');

const OPENWEATHER_API_KEY = 'fff29e5e6a61dcfc71547672f5128519';
const GOOGLE_MAPS_API_KEY = 'AIzaSyCxPG9Ry794NfhUyP0aFBpx0DAIormT91w';

const app = express();
const port = process.env.PORT || 3000;

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

mongoose.connect('mongodb+srv://meirambek:Pa$$529@cluster1.eexs8ak.mongodb.net/?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    creationDate: { type: Date, default: Date.now },
    updateDate: Date,
    deletionDate: Date,
    isAdmin: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);

const historySchema = new mongoose.Schema({
    user_id: String,
    request_path: String,
    request_method: String,
    request_data: Object,
    response_status: Number,
    response_data: Object,
    timestamp: { type: Date, default: Date.now }
});

const HistoryModel = mongoose.model('History', historySchema);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const captureHistory = async (req, res, next) => {
    try {
        const userId = req.session.userId;

        await HistoryModel.create({
            user_id: userId,
            request_path: req.path,
            request_method: req.method,
            request_data: req.body, 
            response_status: res.statusCode,
            response_data: res.locals.responseData,
        });
        next();
    } catch (error) {
        console.error('Error capturing history:', error);
        res.status(500).send('Internal Server Error');
    }
};

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('register', { errorMessage: undefined });
});

app.post('/register', async (req, res) => {
    const { username, password, isAdmin } = req.body;

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.render('register', { errorMessage: 'Username already exists' });
        }

        const newUser = await User.create({
            username,
            password,
            isAdmin: isAdmin === 'on', 
        });

        res.redirect('/login');
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/create-admin', async (req, res) => {
    const { username, password } = req.body;

    try {
        const existingAdmin = await User.findOne({ isAdmin: true });
        if (existingAdmin) {
            return res.render('admin-create', { errorMessage: 'Admin user already exists' });
        }

        const maxUserIdUser = await User.findOne().sort({ user_id: -1 });
        const nextUserId = maxUserIdUser ? maxUserIdUser.user_id + 1 : 1;

        const newAdmin = await User.create({
            user_id: nextUserId,
            username,
            password,
            isAdmin: true,
        });

        res.redirect('/login'); 
    } catch (error) {
        console.error('Error creating admin user:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/admin', async (req, res) => {
    try {
        const users = await User.find();
        res.render('admin', { users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/admin/adduser', async (req, res) => {
    const { newUsername, newPassword, isAdmin } = req.body;

    try {
        const newUser = await User.create({
            username: newUsername,
            password: newPassword,
            isAdmin: isAdmin === 'on', 
        });

        res.redirect('/admin');
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/admin/edit/:_id', async (req, res) => {
    const _id = req.params._id;

    try {
        const user = await User.findById(_id);
        res.render('edit', { user });
    } catch (error) {
        console.error('Error rendering edit form:', error);
        res.status(500).send('Internal Server Error');
    }
});
app.post('/admin/edit/:_id', async (req, res) => {
    const { username, password, isAdmin } = req.body;
    const _id = req.params._id;

    try {
        await User.findByIdAndUpdate(_id, {
            username,
            password,
            isAdmin: isAdmin === 'on',
            updateDate: Date.now()
        });

        res.redirect('/admin');
    } catch (error) {
        console.error('Error editing user:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/admin/delete/:_id', async (req, res) => {
    const _id = req.params._id;

    try {
        await User.findByIdAndDelete(_id);
        res.redirect('/admin');
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/login', (req, res) => {
    res.render('login', { errorMessage: undefined });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });

        if (user && user.password === password) {
            if (username === 'meiramura' && password === 'admin') {
                req.session.isAdmin = true;
                req.session.userId = null; 
                return res.redirect('/admin');
            }

            req.session.userId = user._id;
            req.session.isAdmin = false; 
            res.redirect('/weather');
        } else {
            res.render('login', { errorMessage: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/weather', (req, res) => {
    res.render('weather');
});

app.post('/weather', async (req, res) => {
    const cityName = req.body.city;

    try {
        const weatherData = await getWeatherData(cityName);
        const airQualityData = await getAirQuality(weatherData.coord.lat, weatherData.coord.lon);
        const timeZoneData = await getTimeZone(weatherData.coord.lat, weatherData.coord.lon);

        weatherData.main.temp = convertKelvinToCelsius(weatherData.main.temp);
        weatherData.main.feels_like = convertKelvinToCelsius(weatherData.main.feels_like);

        const savedData = await saveWeatherDataToMongoDB(cityName, weatherData);

        res.json({ ...weatherData, airQuality: airQualityData, timeZone: timeZoneData, savedData });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});

const WeatherModel = mongoose.model('WeatherData', {
    city: String,
    data: Object,
});

async function saveWeatherDataToMongoDB(cityName, weatherData) {
    try {
        const savedData = await WeatherModel.create({
            city: cityName,
            data: weatherData,
        });

        return savedData;
    } catch (error) {
        console.error('Error saving weather data to MongoDB:', error);
        throw error;
    }
}

function convertKelvinToCelsius(kelvin) {
    return Math.round(kelvin - 273.15);
}

async function getWeatherData(cityName) {
    try {
        const response = await axios.get(`http://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${OPENWEATHER_API_KEY}`);
        return response.data;
    } catch (error) {
        throw error;
    }
}

async function getAirQuality(lat, lon) {
    try {
        const response = await axios.get(`http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch air quality data:', error);
        return null;
    }
}

async function getTimeZone(lat, lon) {
    try {
        const response = await axios.get(`https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lon}&timestamp=${Math.floor(Date.now() / 1000)}&key=${GOOGLE_MAPS_API_KEY}`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch time zone data:', error);
        return null;
    }
}

app.use(captureHistory);

app.listen(port, "0.0.0.0", () => {
    console.log(`Server is running on http://localhost:${port}`);
});