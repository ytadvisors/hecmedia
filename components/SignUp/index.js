import React, { Component } from "react";
import SignUpForm from "../Forms/SignUpForm";

export default class SignUp extends Component {
  signup = () => {
    console.log("subscribe");
  };

  render() {
    return (
      <section className="signup">
        <SignUpForm callbackFunc={this.signup} />
      </section>
    );
  }
}
