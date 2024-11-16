const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

app.use(express.static(path.join(__dirname)));

const users = [
    {
        username: 'admin',
        passwordHash: '$2b$10$bcOqUtEcJlvid4YI9dKjT.Bt/xxdJ831Uz6QpNFPb9xWYjBF7cIgS'
    }
];

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'audio/mpeg') {
            cb(null, true);
        } else {
            cb(new Error('Only MP3 files are allowed!'), false);
        }
    }
});

const songs = [];

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    console.log('Received credentials:', { username, password });

    const user = users.find(u => u.username === username);
    if (user && await bcrypt.compare(password, user.passwordHash)) {
        console.log('Login successful!');
        return res.json({ message: 'Login successful!', username });
    }

    console.log('Invalid username or password!');
    return res.status(401).json({ message: 'Invalid username or password!' });
});

app.post('/upload', upload.single('song'), (req, res) => {
    const { title, artist } = req.body;

    if (!title || !artist || !req.file) {
        return res.status(400).json({ message: 'All fields are required!' });
    }

    const songUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    songs.push({ title, artist, url: songUrl });

    console.log('Song uploaded:', { title, artist, url: songUrl });
    res.json({ message: 'Song uploaded successfully!', songUrl });
});

app.get('/songs', (req, res) => {
    const uploadPath = path.join(__dirname, 'uploads');

    fs.readdir(uploadPath, (err, files) => {
        if (err) {
            return res.status(500).json({ message: 'Unable to retrieve songs.' });
        }

        const songList = files.map(file => {
            const song = songs.find(s => s.url.includes(file)) || { title: 'Unknown', artist: 'Unknown' };
            return {
                title: song.title,
                artist: song.artist,
                url: `${req.protocol}://${req.get('host')}/uploads/${file}`
            };
        });

        res.json(songList);
    });
});


app.delete('/songs/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found!' });
    }

    fs.unlink(filePath, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Unable to delete the file.' });
        }

        const songIndex = songs.findIndex(song => song.url.includes(filename));
        if (songIndex !== -1) {
            songs.splice(songIndex, 1);
        }

        res.json({ message: 'File deleted successfully!' });
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
