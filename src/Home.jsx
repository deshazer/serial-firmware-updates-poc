import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <>
      <h1>Home</h1>
      <p>
        <Link to="/serial" style={{ color: 'white' }}>
          Serial &gt;
        </Link>
      </p>
    </>
  );
};

export default Home;
