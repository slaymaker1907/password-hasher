import ReactDOM from "react-dom";
import React from "react";

class HelloWorld extends React.Component {
  render() {
    return <h1>Hello, world!</h1>;
  }
}
module.exports = HelloWorld;

ReactDOM.render(<HelloWorld/>, document.getElementById("example"));


 
