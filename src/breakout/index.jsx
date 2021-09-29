import React from "react";
import { BrowserRouter as Router, Route } from "react-router-dom";
import BreakoutRoom from "./Page";

const Breakout = () => {
  return (
    <Router>
      <Route exact path="/" component={BreakoutRoom} />
      <Route exact path="/:name" component={BreakoutRoom} />
    </Router>
  );
};

export { Breakout };
