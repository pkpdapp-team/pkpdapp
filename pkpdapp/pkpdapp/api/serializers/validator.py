class ValidSbml:
    def __call__(self, value):
        try:
            MyokitModelMixin.parse_sbml_string(value)
        except SBMLParsingError as e:
            raise serializers.ValidationError(e)


