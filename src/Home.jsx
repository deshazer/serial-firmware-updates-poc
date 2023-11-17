import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <>
      <h1>Home</h1>
      <p>
        <Link to="/firmware" style={{ color: 'white' }}>
          Firmware &gt;
        </Link>
      </p>
    </>
  );
};

export default Home;
