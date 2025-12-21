using AIPlantHealthCheck.Domain.AggregatesModel.DeliverAggregate;
using AIPlantHealthCheck.Domain.AggregatesModel.OrderAggregate;
using AIPlantHealthCheck.Infrastructure.Repositories;
using NetCorePal.Extensions.Primitives;

namespace AIPlantHealthCheck.Web.Application.Commands.Delivers;

public record DeliverGoodsCommand(OrderId OrderId) : ICommand<DeliverRecordId>;

public class DeliverGoodsCommandHandler(IDeliverRecordRepository deliverRecordRepository)
    : ICommandHandler<DeliverGoodsCommand, DeliverRecordId>
{
    public Task<DeliverRecordId> Handle(DeliverGoodsCommand request, CancellationToken cancellationToken)
    {
        var record = new DeliverRecord(request.OrderId);
        deliverRecordRepository.Add(record);
        return Task.FromResult(record.Id);
    }
}