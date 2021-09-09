import React from 'react';
// import { BrowserRouter as Router, Route } from "react-router-dom";
import ReactDOM, { render } from 'react-dom';

// import { Provider } from 'react-redux';
// // import store from "./redux/store";

// import ReactGA from 'react-ga';

// import { LocalizeProvider } from "react-localize-redux";

// import { history } from './_helpers';
// import Main from './main';

// import { ApolloProvider } from '@apollo/client/react';
// import { ApolloClient, InMemoryCache } from '@apollo/client';

// import { startWebsocketConnection } from '@/_helpers/chat-sockets';
// import { startTickerWebsocketConnection } from '@/_helpers/tickers-sockets';

import './styles.less';
// import Page from './breakout/Page';
import { Breakout } from './breakout';

window.JitsiMeetJS.init();

// ReactGA.initialize('UA-182310569-3');

// history.listen(location => {
//   ReactGA.set({ page: location.pathname }); // Update the user's current page
//   ReactGA.pageview(window.location.pathname + window.location.search); // Record a pageview for the given page
// });

// const client = new ApolloClient({
//   uri: 'https://48p1r2roz4.sse.codesandbox.io',
//   cache: new InMemoryCache()
// });

const App = props => (
  <>
    <Breakout />
  </>
);

ReactDOM.render(<App />, document.getElementById("app"));
// startWebsocketConnection();
// startTickerWebsocketConnection();