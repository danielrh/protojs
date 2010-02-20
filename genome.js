if (typeof(Elysia)=="undefined") {Elysia = {};}
if (typeof(Elysia.Genome)=="undefined") {Elysia.Genome = {};}

Elysia.Genome.Effect= PROTO.Enum("Elysia.Genome.Effect",{
		CUSTOM :0,
		GROW_LEAF :1,
		GROW_NEURON :2,
		BASE_BRANCHINESS :3,
		TIP_BRANCHINESS :4,
		BASE_THRESHOLD :5,
		TIP_THRESHOLD :6,
		TREE_DEPTH :7,
		FIRING_TIME :8,
		RECEPTIVITY_TIME :9,
		LEARNING_RESPONSIVENESS :12,
		INHIBITION :13,
		AGGRESSIVE_DEVELOPMENT :14});
Elysia.Genome.Protein = PROTO.Message("Elysia.Genome.Protein",{
	protein_code: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Elysia.Genome.Effect;},
		id: 1
	},
	density: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Float;},
		id: 2
	}});
Elysia.Genome.Proteins = PROTO.Message("Elysia.Genome.Proteins",{
	proteins: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Elysia.Genome.Protein;},
		id: 1
	}});
Elysia.Genome.TemporalBoundingBox = PROTO.Message("Elysia.Genome.TemporalBoundingBox",{
	minx: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.Float;},
		id: 1
	},
	maxx: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.Float;},
		id: 2
	},
	miny: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.Float;},
		id: 3
	},
	maxy: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.Float;},
		id: 4
	},
	minz: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Float;},
		id: 5
	},
	maxz: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Float;},
		id: 6
	},
	mint: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Float;},
		id: 7
	},
	maxt: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Float;},
		id: 8
	}});
Elysia.Genome.Condition = PROTO.Message("Elysia.Genome.Condition",{
	protein: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint64;},
		id: 1
	},
	Test: PROTO.Enum("Elysia.Genome.Condition.Test",{
		ANY_CONCENTRATION :0,
		CONCENTRATION_GREATER :1,
		CONCENTRATION_LESS :2,
		NO_CONCENTRATION :3	}),
	test: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Elysia.Genome.Condition.Test;},
		id: 2
	},
	density: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Float;},
		id: 3
	}});
Elysia.Genome.ConditionClause = PROTO.Message("Elysia.Genome.ConditionClause",{
	disjunction: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Elysia.Genome.Condition;},
		id: 1
	}});
Elysia.Genome.Gene = PROTO.Message("Elysia.Genome.Gene",{
	position: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.Float;},
		id: 1
	},
	external_proteins: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Elysia.Genome.Protein;},
		id: 2
	},
	internal_proteins: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Elysia.Genome.Protein;},
		id: 3
	},
	bounds: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Elysia.Genome.TemporalBoundingBox;},
		id: 4
	},
	conjunction: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Elysia.Genome.ConditionClause;},
		id: 5
	},
	target_region: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Elysia.Genome.TemporalBoundingBox;},
		id: 6
	}});
Elysia.Genome.Chromosome = PROTO.Message("Elysia.Genome.Chromosome",{
	genes: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Elysia.Genome.Gene;},
		id: 1
	}});
Elysia.Genome.Genome = PROTO.Message("Elysia.Genome.Genome",{
	fathers: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Elysia.Genome.Chromosome;},
		id: 1
	},
	mothers: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Elysia.Genome.Chromosome;},
		id: 2
	}});
