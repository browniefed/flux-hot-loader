# flux-hot-loader
Like React Hot Loader, but for Flux stores.

**Very sketchy at the moment,** watch the repo to get notified about first release.

### Big Idea

1. You fiddle with the interface, perform some actions
2. Your store does something wrong, you fix its code and press Cmd+S
3. Flux Hot Loader replaces your Store on the fly and replays all actions on it with the new code
4. React Hot Loader reloads your components to point to new Stores

Kudos to Jing Chen for suggesting this.

### It Probably Won't Work For You Quite Yet..

But if you're really adventurous, [see instructions for trying it out](https://github.com/gaearon/react-hot-loader/issues/30#issuecomment-72126754).
