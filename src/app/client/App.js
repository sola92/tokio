import React, { Component } from "react";
import { observable } from "mobx";
import { observer } from "mobx-react";

import "./css/app.css";
import logo from "./img/react.png";

type Props = {};

@observer
export default class App extends Component<Props> {
  @observable
  username: ?string = null;

  componentDidMount() {
    fetch("/api/users/1")
      .then(res => res.json())
      .then(user => (this.username = user.username));
  }

  render() {
    const { username } = this;
    return (
      <div>
        {username ? (
          <h1>{`Hello ${username}`}</h1>
        ) : (
          <h1>Loading.. please wait!</h1>
        )}
        <img src={logo} alt="react" />
      </div>
    );
  }
}
