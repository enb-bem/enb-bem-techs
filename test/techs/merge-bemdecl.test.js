var path = require('path'),
    vow = require('vow'),
    mockFs = require('mock-fs'),
    fileList = require('enb/lib/file-list'),
    TestNode = require('enb/lib/test/mocks/test-node'),
    Tech = require('../../techs/merge-bemdecl');

describe('techs', function () {
    describe('merge-bemdecl', function () {
        afterEach(function () {
            mockFs.restore();
        });

        it('must provide result', function (done) {
            var sources = [[{ name: 'block' }]],
                bemdecl = [{ name: 'block' }];

            assert(sources, bemdecl, done);
        });

        it('must provide result from cache', function (done) {
            mockFs({
                bundle: {
                    'bundle.bemdecl.js': 'exports.blocks = ' + JSON.stringify([
                        { name: 'other-block' }
                    ]) + ';',
                    'bundle-1.bemdecl.js': 'exports.blocks = ' + JSON.stringify([{ name: 'block-1' }]) + ';',
                    'bundle-2.bemdecl.js': 'exports.blocks = ' + JSON.stringify([{ name: 'block-2' }]) + ';'
                }
            });

            var bundle = new TestNode('bundle'),
                cache = bundle.getNodeCache('bundle.bemdecl.js');

            cache.cacheFileInfo('bemdecl-file', path.resolve('bundle', 'bundle.bemdecl.js'));
            cache.cacheFileList('source-file-list', [
                path.resolve('bundle', 'bundle-1.bemdecl.js'),
                path.resolve('bundle', 'bundle-2.bemdecl.js')
            ].map(function (filename) {
                return fileList.getFileInfo(filename);
            }));

            return bundle.runTech(Tech, { sources: ['bundle-1.bemdecl.js', 'bundle-2.bemdecl.js'] })
                .then(function (target) {
                    target.blocks.must.eql([{ name: 'other-block' }]);
                })
                .then(done, done);
        });

        it('must merge block with mod of block', function (done) {
            var bemdecl1 = [{ name: 'block' }],
                bemdecl2 = [{
                    name: 'block',
                    mods: [{ name: 'mod-name', vals: [{ name: 'mod-val' }] }]
                }],
                exepted = [
                    { name: 'block' },
                    { name: 'block', mods: [{ name: 'mod-name', vals: [{ name: 'mod-val' }] }] }
                ];

            assert([bemdecl1, bemdecl2], exepted, done);
        });

        it('must merge block with elem', function (done) {
            var bemdecl1 = [{ name: 'block' }],
                bemdecl2 = [{
                    name: 'block',
                    elems: [{ name: 'elem' }]
                }],
                exepted = [
                    { name: 'block' },
                    { name: 'block', elems: [{ name: 'elem' }] }
                ];

            assert([bemdecl1, bemdecl2], exepted, done);
        });

        it('must merge elem with mod of elem', function (done) {
            var bemdecl1 = [{
                    name: 'block',
                    elems: [{ name: 'elem' }]
                }],
                bemdecl2 = [{
                    name: 'block',
                    elems: [{ name: 'elem', mods: [{ name: 'modName', vals: [{ name: 'modVal' }] }] }]
                }],
                exepted = [
                    { name: 'block' },
                    { name: 'block', elems: [{ name: 'elem' }] },
                    { name: 'block', elems: [{ name: 'elem', mods: [
                        { name: 'modName', vals: [{ name: 'modVal' }] }
                    ] }] }
                ];

            assert([bemdecl1, bemdecl2], exepted, done);
        });

        it('must merge elems of block', function (done) {
            var bemdecl1 = [{
                    name: 'block',
                    elems: [{ name: 'elem-1' }]
                }],
                bemdecl2 = [{
                    name: 'block',
                    elems: [{ name: 'elem-2' }]
                }],
                exepted = [
                    { name: 'block' },
                    { name: 'block', elems: [{ name: 'elem-1' }] },
                    { name: 'block', elems: [{ name: 'elem-2' }] }
                ];

            assert([bemdecl1, bemdecl2], exepted, done);
        });

        it('must merge set with empty set', function (done) {
            var bemdecl1 = [],
                bemdecl2 = [{ name: '1' }, { name: '2' }, { name: '3' }],
                exepted = [{ name: '1' }, { name: '2' }, { name: '3' }];

            assert([bemdecl1, bemdecl2], exepted, done);
        });

        it('must merge intersecting sets', function (done) {
            var bemdecl1 = [{ name: '1' }, { name: '2' }, { name: '3' }],
                bemdecl2 = [{ name: '2' }],
                exepted = [{ name: '1' }, { name: '2' }, { name: '3' }];

            assert([bemdecl1, bemdecl2], exepted, done);
        });

        it('must merge disjoint sets', function (done) {
            var bemdecl1 = [{ name: '1' }, { name: '2' }, { name: '3' }],
                bemdecl2 = [{ name: 'O_o' }],
                exepted = [{ name: '1' }, { name: '2' }, { name: '3' }, { name: 'O_o' }];

            assert([bemdecl1, bemdecl2], exepted, done);
        });
    });
});

function assert(sources, expected, done) {
    var bundle,
        dir = {},
        options = { sources: [] };

    sources.forEach(function (bemdecl, i) {
        var target = i + '.bemdecl.js';

        dir[target] = 'exports.blocks = ' + JSON.stringify(bemdecl) + ';';
        options.sources.push(target);
    });

    mockFs({ bundle: dir });
    bundle = (new TestNode('bundle'));

    return vow.all([
            bundle.runTechAndGetResults(Tech, options),
            bundle.runTechAndRequire(Tech, options)
        ])
        .spread(function (target1, target2) {
            target1['bundle.bemdecl.js'].blocks.must.eql(expected);
            target2[0].blocks.must.eql(expected);
        })
        .then(done, done);
}
