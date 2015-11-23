/*
 * GET/POST hosts page
 */

var config = require('../config')

allowAccess = function(req) {
	return (
		( req.session.loggedIn && (req.session.user.Role == 'Admin') ) ||
		( (req.body.APIKey !== undefined) && config.validateAPIKey(req.body.APIKey) )
		); 
}

insertHostByGroupId = function(params, req, res, idGroup) {
	var config = params.config;
	var db = params.db;

				params.db('hosts').insert({
					Name: req.body.name,
					Url: req.body.url,
					idGroup: idGroup,
				}, 'idHost').exec(function(err, insertId){
					params.config.readHosts(params.db, function(){
						if (err !== null) {
							console.log(err);
							res.redirect('/hosts');
						} else {
							res.redirect('/host/' + insertId);
						}
					});
				});
}

deleteHostByHostId = function(params, req, res, idHost) {
				params.db('hosts').delete()
				.where('idHost', idHost)
				.exec(function() {
					params.config.readHosts(params.db, function(){
						res.redirect('/hosts');
					});
				});
}

exports.hosts = function(params) {
	var config = params.config;
	var db = params.db;
	return function(req, res) {
		if (!allowAccess(req)) {
			res.redirect('/login');
		} else if (req.body.delete !== undefined) {
			req.params.idHost
			if (isNaN(req.params.idHost)) {
                                var nameHost = req.params.idHost; // req.body.nameHost;
				params.db('hosts').select('idHost')
                                .where('Name', nameHost)
                                .exec(function(err, hosts) {
					if (hosts.length > 0) {
						var newHostId = hosts[0].idHost;
                                		deleteHostByHostId(params, req, res, newHostId);
					} else {
							res.redirect('/hosts');
					}
				})
			} else if (req.params.idHost) {
                                deleteHostByHostId(params, req, res, req.params.idHost);
			}
		} else if (req.body.submit !== undefined) {
			if (req.params.idHost == 'new') {

                                var qry = params.db('groups');

                                // if request inserting and group not an id, look up id
                                if (isNaN(req.body.group)) {
					qry.select('idGroup').where('Name', req.body.group)
					.exec(function(err, groups){
                                              // if group not found, insert it
						if (groups.length == 0) {
							qry.insert({
								Name: req.body.group,
							}, 'idGroup').exec(function(err, insertId){
                                                                var newGroupId = insertId[0];
								insertHostByGroupId(params, req, res, newGroupId);
							})
						} else {
							// else group found, use it
							var gotGroupId = groups[0].idGroup;
							insertHostByGroupId(params, req, res, gotGroupId);
							}
						});
                                } else {
                                      var groupId = req.body.group;
                                      insertHostByGroupId(params, req, res, groupId);
                                }

			} else {
				var info = {
					Name: req.body.name,
					Url: req.body.url,
					idGroup: req.body.group !== 'null' ? req.body.group : 0
				};

				console.log(info);

				params.db('hosts').update(info)
				.where('idHost', req.params.idHost)
				.exec(function() {
					params.config.readHosts(params.db, function(){
						res.redirect('/host/' + req.params.idHost);
					});
				});
			}
		} else {
			var qry = params.db('hosts');

			if (req.params.idHost) {
				if (req.params.idHost == 'new') {
					qry = params.db('groups').select('idGroup', 'Name');
					qry.exec(function(err, groups){
						res.render('edit_host', {
							title: 'Nodervisor - New Host',
							host: null,
							groups: groups,
							session: req.session
						});
					});
				} else {
					qry.where('idHost', req.params.idHost)
					.exec(function(err, host){
						qry = params.db('groups').select('idGroup', 'Name');
						qry.exec(function(err, groups){
							res.render('edit_host', {
								title: 'Nodervisor - Edit Host',
								host: host[0],
								groups: groups,
								session: req.session
							});
						});
					});
				}
			} else {
				qry.join('groups', 'hosts.idGroup', '=', 'groups.idGroup', 'left')
				.select('hosts.idHost', 'hosts.Name', 'hosts.Url', 'groups.Name AS GroupName')
				.exec(function(err, hosts){
					res.render('hosts', {
						title: 'Nodervisor - Hosts',
						hosts: hosts,
						session: req.session
					});
				});
			}
		}
	};
};
