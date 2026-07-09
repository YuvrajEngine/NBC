import * as React from "react";
import styles from "./Nbc.module.scss";
import type { INbcProps } from "./INbcProps";
import { HashRouter, Switch, Route } from "react-router-dom";
//-----Pages-----//
import Dashboard from "./Pages/Dashboard";
import NewRequest from "./Pages/NewRequest";
import ViewRequest from "./Pages/ViewRequest";
import EditRequest from "./Pages/EditRequest";

export default class Nbc extends React.Component<INbcProps> {
  public render(): React.ReactElement<INbcProps> {
    return (
      <section className={styles.nbc}>
        <HashRouter>
          <Switch>
            <Route exact path="/" render={() => <Dashboard {...this.props} />} />
            <Route exact path="/Dashboard" render={() => <Dashboard {...this.props} />} />
            <Route exact path="/NewRequest" render={() => <NewRequest {...this.props} />} />
            <Route exact path="/ViewRequest/:id" render={() => <ViewRequest {...this.props} />} />
            <Route exact path="/EditRequest/:id" render={() => <EditRequest {...this.props} />} />
          </Switch>
        </HashRouter>
      </section>
    );
  }
}