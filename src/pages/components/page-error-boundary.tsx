import {Component, type PropsWithChildren} from "react";
import {Alert, Button} from "react-bootstrap";

type PageErrorBoundaryProps = PropsWithChildren<{page: string}>;

export default class PageErrorBoundary extends Component<PageErrorBoundaryProps, {failed: boolean}> {
    state = {failed: false};

    static getDerivedStateFromError() {
        return {failed: true};
    }

    componentDidUpdate(previous: PageErrorBoundaryProps) {
        if (this.state.failed && previous.page !== this.props.page) {
            this.setState({failed: false});
        }
    }

    render() {
        if (!this.state.failed) return this.props.children;

        return <Alert variant="warning" className="mx-auto">
            <Alert.Heading>This page couldn’t open</Alert.Heading>
            <p>Reload to try again, or use the menu to open another page.</p>
            <Button variant="outline-primary" onClick={() => { window.location.reload(); }}>Reload page</Button>
        </Alert>;
    }
}
