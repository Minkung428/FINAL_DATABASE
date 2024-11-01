const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const { error } = require('console');

dotenv.config();

// Initialize the Express app
const app = express();

// Middleware setup
app.use(express.urlencoded({ extended: false }));
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'your_secret_key'], // Use a secret key for sessions
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// Static files and view engine setup
app.use(express.static('public'));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.set('views', path.join(__dirname, 'public/views'));
app.set('view engine', 'ejs');

const port = 3000;

// Create MySQL connection
const connection = mysql.createConnection(process.env.DATABASE_URL);

app.get('/popular_song', (req, res, next) => {
  connection.query(
    'SELECT track_id, artist_name, title, duration, year FROM combined_data_filtered WHERE year != 0 LIMIT 100',
    (err1, results1) => {
      if (err1) return next(err1); // Handle error

      // Fetch distinct years for dropdown
      connection.query(
        'SELECT DISTINCT year FROM combined_data_filtered WHERE year != 0 ORDER BY year DESC',
        (err2, results2) => {
          if (err2) return next(err2); // Handle error

          // Render the results
          res.render('popularsong', { session: req.session, songData: results1, yearData: results2 });
        }
      );
    }
  );
});

// POST route to filter and sort songs based on user selections
app.post('/popular_song', function(req, res, next) {
  let sortColumn = 'duration';
  let sortOrder = 'DESC';

  if (req.body.sort) {
    switch (req.body.sort) {
      case 'year-asc':
        sortColumn = 'year';
        sortOrder = 'ASC';
        break;
      case 'year-desc':
        sortColumn = 'year';
        sortOrder = 'DESC';
        break;
      case 'duration-asc':
        sortColumn = 'duration';
        sortOrder = 'ASC';
        break;
      case 'duration-desc':
        sortColumn = 'duration';
        sortOrder = 'DESC';
        break;
    }
  }

  let yearFilter = req.body.year || 'all';
  let query = `SELECT track_id, artist_name, title, duration, year FROM combined_data_filtered WHERE year != 0`;
  const queryParams = [];

  if (yearFilter !== 'all') {
    query += ` AND year = ?`;
    queryParams.push(yearFilter);
  }

  query += ` ORDER BY ${sortColumn} ${sortOrder} LIMIT 100`;

  connection.query(query, queryParams, function(err1, results1) {
    if (err1) {
      console.error('Error fetching popular songs:', err1);
      return next(err1);
    }

    // Fetch distinct years for dropdown
    connection.query(
      'SELECT DISTINCT year FROM combined_data_filtered WHERE year != 0 ORDER BY year DESC',
      function(err2, results2) {
        if (err2) {
          console.error('Error fetching distinct years:', err2);
          return next(err2);
        }

        // Render the results
        res.render('popularsong', { session: req.session, songData: results1, yearData: results2 });
      }
    );
  });
});

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next(); // User is authenticated, proceed to the requested route
  }
  res.redirect('/login'); // Redirect to login if not authenticated
}

// Route to render the admin page
app.get('/admin', isAuthenticated, (req, res) => {
  res.render('admin', { session: req.session }); // Pass session info to the view
});

// Route to display popular songs

// Additional Routes
app.get('/', (req, res, next) => {
  res.render('index', { session: req.session }); // Pass session info to the view
});

app.get('/login', (req, res, next) => {
  res.render('login', { session: req.session }); // Pass session info to the view
});

app.get('/register', (req, res, next) => {
  res.render('register', { session: req.session }); // Pass session info to the view
});

// Logout Route
app.get('/logout', (req, res) => {
  req.session = null; // Clear the session
  res.redirect('/login'); // Redirect to the login page
});

//Insert Route
app.get('/admin/insert', (req, res) => {
    res.render('admin_insert', { session: req.session }); // Render the 'admin_insert.ejs' view
});

// Search Route
app.get('/admin/search', (req, res) => {
  res.render('admin_search', { session: req.session ,values:[]}); // Render the 'admin_search.ejs' view
});
// Edit Route
app.get('/admin/edit', (req, res) => {
    res.render('admin_edit', { session: req.session }); // Render the 'admin_edit.ejs' view
});

// Delete Route
app.get('/admin/delete', (req, res) => {
    res.render('admin_delete', { session: req.session }); // Render the 'admin_delete.ejs' view
});

// Registration Route
app.post('/register', async (req, res) => {
  const { user_name, user_pass } = req.body;

  // Check if username already exists
  connection.query(
    'SELECT * FROM users WHERE username = ?',
    [user_name],
    async (error, results) => {
      if (error) {
        console.error('Database error:', error);
        return res.status(500).send('An error occurred');
      }

      if (results.length > 0) {
        // Username already taken
        return res.status(409).json({ message: 'Username already exists. Please choose another.' });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(user_pass, 10);

      // Insert new user into the database
      connection.query(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [user_name, hashedPassword],
        (error, results) => {
          if (error) {
            console.error('Database error:', error);
            return res.status(500).send('An error occurred');
          }

          // Registration successful, respond with JSON
          res.json({ success: true, message: 'Registration successful!' });
        }
      );
    }
  );
});

// Login Route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  connection.query(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (error, results) => {
      if (error) {
        console.error('Database error:', error);
        return res.status(500).send('An error occurred');
      }

      if (results.length === 0) {
        // Respond with JSON error message
        return res.status(401).json({ message: 'Incorrect username or password' });
      }

      const user = results[0];

      // Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        // Respond with JSON error message
        return res.status(401).json({ message: 'Incorrect username or password' });
      }

      // Store user session if authentication is successful
      req.session.userId = user.id;
      res.json({ success: true }); // Indicate success
    }
  );
});

app.get('/dashboard', (req, res, next) => {
  connection.query(
    'SELECT track_id, artist_name, title, duration, year FROM combined_data_filtered WHERE year != 0 LIMIT 100',
    (err1, results1) => {
      if (err1) return next(err1);

      connection.query(
        'SELECT DISTINCT year FROM combined_data_filtered WHERE year != 0 ORDER BY year DESC',
        (err2, results2) => {
          if (err2) return next(err2);

          const artistCount = new Set(results1.map(song => song.artist_name)).size;
          const songCount = results1.length;
          const maxValue = Math.max(artistCount, songCount);

          // Render with default values, including a default 'all' year filter
          res.render('dashboard', {
            session: req.session,
            songData: results1,
            yearData: results2,
            artistCount,
            songCount,
            loudestSong: { title: 'N/A', loudness: null },
            longestSong: { title: 'N/A', duration: null },
            maxValue,
            scaleFactor: 200,
            yearFilter: "all"
          });
        }
      );
    }
  );
});

app.post('/dashboard', (req, res, next) => {
  let yearFilter = req.body.year || 'all'; // Make sure yearFilter is defined here
  let sortColumn = 'duration';
  let sortOrder = 'DESC';

  let query = 'SELECT track_id, artist_name, title, duration, year, loudness FROM combined_data_filtered WHERE year != 0';
  const queryParams = [];

  if (yearFilter !== 'all') {
      query += ' AND year = ?';
      queryParams.push(yearFilter);
  }

  query += ` ORDER BY ${sortColumn} ${sortOrder} LIMIT 50`;

  connection.query(query, queryParams, (err1, results1) => {
      if (err1) {
          console.error('Error fetching songs:', err1);
          return next(err1);
      }

      connection.query('SELECT DISTINCT year FROM combined_data_filtered WHERE year != 0 ORDER BY year DESC', (err2, results2) => {
          if (err2) {
              console.error('Error fetching distinct years:', err2);
              return next(err2);
          }

          const artistCount = new Set(results1.map(song => song.artist_name)).size;
          const songCount = results1.length;

          const validSongs = results1.filter(song => song.loudness !== null);
          const loudestSong = validSongs.length > 0 
              ? validSongs.reduce((max, song) => (song.loudness > max.loudness ? song : max), validSongs[0]) 
              : { title: 'N/A', loudness: null };
          const longestSong = results1.reduce((max, song) => (song.duration > max.duration ? song : max), { title: 'N/A', duration: null });

          const loudness = loudestSong.loudness || 0;
          const duration = longestSong.duration || 0;
          const maxValue = Math.max(artistCount, songCount, loudness, duration);
          const scaleFactor = 200;
          res.render('dashboard', {
            session: req.session,
            songData: results1,
            yearData: results2,
            artistCount,
            songCount,
            loudestSong,
            longestSong,
            maxValue,
            scaleFactor,
            yearFilter // Pass yearFilter to the view here
        });
    });
  });
});

// Assuming you already have Express and MySQL connection set up

app.post('/admin/save/insert_song', (req, res, next) => {
  const { artist_name, track_id, title, duration, year } = req.body;

  // Prepare the SQL query
  const query = `
      INSERT INTO combined_data_filtered (artist_name, track_id, title, duration, year) 
      VALUES (?, ?, ?, ?, ?)`;

  // Execute the query
  connection.query(query, [artist_name, track_id, title, duration, year], (err, result) => {
      if (err) {
          console.error('Error inserting data:', err);
          return next(err);
      }

      // Redirect or render a success message
      res.redirect('/admin/insert'); // Redirect to the dashboard or another page after saving
  });
});

app.post('/admin/save/search', (req, res) => {
  const type = 'search';
  const requireData = {
      artist_name: req.body.artist_name,
      title: req.body.song_name, // Changed song_name to title for consistency
      year: req.body.year
  };
  console.log(requireData);
  function searchfunc(requireData) {
    let year = null;
    let querySearch = null;
    
    // Build the query based on provided parameters
    if (requireData.title && requireData.artist_name && requireData.year) {
        querySearch = `SELECT DISTINCT c.artist_name, c.title, c.year, c.track_id 
                       FROM combined_data_filtered c 
                       WHERE c.year != 0 AND c.year = ${requireData.year} 
                       AND c.title = '${requireData.title}' 
                       AND c.artist_name = '${requireData.artist_name}'`;
        year = requireData.year;
    } else if (requireData.title && requireData.year) {
        querySearch = `SELECT DISTINCT c.artist_name, c.title, c.year, c.track_id 
                       FROM combined_data_filtered c 
                       WHERE c.year != 0 AND c.year = ${requireData.year}
                       AND c.title = '${requireData.title}'`;
        year = requireData.year;
    } else if (requireData.artist_name && requireData.year) {
        querySearch = `SELECT DISTINCT c.artist_name, c.title, c.year, c.track_id 
                       FROM combined_data_filtered c 
                       WHERE c.year != 0 AND c.year = ${requireData.year} 
                       AND c.artist_name = '${requireData.artist_name}'`;
        year = requireData.year;
    } else if (requireData.artist_name && requireData.title) {
        querySearch = `SELECT DISTINCT c.artist_name, c.title, c.year, c.track_id 
                       FROM combined_data_filtered c 
                       WHERE c.year != 0 AND c.title = '${requireData.title}' 
                       AND c.artist_name = '${requireData.artist_name}'`;
    } else if (requireData.artist_name) {
        querySearch = `SELECT DISTINCT c.artist_name, c.title, c.year ,  c.track_id 
                       FROM combined_data_filtered c 
                       WHERE c.year != 0 AND c.artist_name = '${requireData.artist_name}'`;
    } else if (requireData.title) {
        querySearch = `SELECT DISTINCT c.artist_name, c.title, c.year, c.track_id 
                       FROM combined_data_filtered c 
                       WHERE c.year != 0 AND c.title = '${requireData.title}'`;
    } else if (requireData.year) {
        querySearch = `SELECT DISTINCT c.artist_name, c.title, c.year , c.track_id 
                       FROM combined_data_filtered c 
                       WHERE c.year != 0 AND c.year = ${requireData.year}`;
    } else {
        // Fallback case if no criteria is provided (could also return an error)
        querySearch = `SELECT DISTINCT c.artist_name, c.title, c.year FROM combined_data_filtered c `;
    }
    
    return { querySearch, year };
  }

  
  const { querySearch, year } = searchfunc(requireData);

  console.log(querySearch)

  // req.db.query(querySearch, (err, results) => {
  //   if (err) {
  //     console.error('Error occurred while fetching data: ', err);
  //     return res.status(500).json({ error: 'Error fetching data' });
  //   }

  //   console.log("Query Results:", results);
  //   res.render('admin_search', { type, session: req.session, values: results });
  // });
  connection.query(querySearch,(error, results) => {
      if (error) {
        console.error('Database error:', error);
        return res.status(500).send('An error occurred');
      }
      console.log("Query Results:", results);
      res.render('admin_search', { type, session: req.session, values: results });
    }
  );
});

app.get('/admin/delete/data',(req,res) =>{
    
      const type = 'search'
      let  idsong  = req.query.id
      const trackId = idsong.replace(/^b'|\'$/g, ''); // Remove b' at the start and ' at the end

      console.log(trackId)
      let query = `DELETE FROM combined_data_filtered
            WHERE track_id = '${trackId}'`;

      connection.query(query,(error, results) => {
        if (error) {
          console.error('Database error:', error);
          return res.status(500).send('An error occurred');
        }
        console.log("Delete finsih!!!!!!!!!!");
        res.render('admin_search', { type, session: req.session, values:[] });
      }
    );
})





// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

