define([
  'core/js/adapt',
  './adapt-contrib-xapi'
], function(Adapt, xapi) {

  //xAPI handler for Adapt.offlineStorage interface.
  class OfflineStorage {

    constructor() {
      this.store = new Backbone.Model();
      this.isDataRestored = false;
    }

    get(name) {
      if (!name) {
        return this.getAll();
      }

      if (!this.useTemporaryStore() && name.toLowerCase() === 'learnerinfo') {
        return this.getLearnerInfo();
      }

      return this.store.get(name);
    }

    getAll() {
      console.log('in offline');
      console.log(xapi);
      console.log(this.isDataRestored);
      if (!this.isDataRestored) {
        const state = xapi.get('state') || {};
        this.store.set(state.offlineStorage);
        this.isDataRestored = true;
      }

      //If not connected return just the store.
      if (this.useTemporaryStore()) {
        return this.store.toJSON();
      }

      return _.extend(this.store.toJSON(), {
        learnerInfo: this.getLearnerInfo()
      });
    }

    set(name, value) {
      this.store.set(name, value);

      // Use a lightweight fake model to pass into xAPI.sendState
      const fakeModel = {
        get: function() {
          return 'offlineStorage';
        }
      };

      // xAPI may not yet be initialised so use a soft trigger rather than hard calling xAPI.sendState
      Adapt.trigger('state:change', fakeModel, this.store.toJSON());
    }

    useTemporaryStore() {
      return !xapi.get('isInitialised');
    }

    /**
     * @returns {{id: string, name: string, firstname: string, lastname: string}} The learner's id, full name (in the format Firstname Lastname), first and last names
     */
    getLearnerInfo() {
      const actor = xapi.get('actor') || {};
      const name = actor.name || '';
      let lastname;
      let firstname;
      const matches = name.match(/(\S+)\s(.+)/);

      if (matches && matches.length > 2) {
        lastname = matches[2];
        firstname = matches[1];
      } else {
        console.log('xAPI: actor name not in "firstname lastname" format');
      }

      return {
        id: this.getLearnerId(actor),
        name: name,
        lastname: lastname,
        firstname: firstname
      };
    }

    /**
     * Get the learner's id by checking the actor properties in the order 'name', 'openid', 'mbox'
     * @param {object} actor
     * @return {string} the learner's unique id
     */
    getLearnerId(actor) {
      const name = actor.account && actor.account.name;

      if (name) {
        return name;
      }

      if (actor.openid) {
        return actor.openid;
      }

      if (typeof actor.mbox === 'string' && actor.mbox.length > 0) {
        return actor.mbox.replace('mailto:', '')
      }

      console.log('xAPI: could not determine the learner\'s ID');

      return null;
    }
  }

  return new OfflineStorage();
});
